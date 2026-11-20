from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.common.status import RecordStatus
from apps.common.testing import create_active_user, grant, grant_crud
from apps.customer.models import Customer
from apps.product.models import Part, Product, SerializedUnit
from apps.service.models import Diagnosis, PartConsumption, ServiceOrder


class ServiceOrderApiTests(APITestCase):
    def setUp(self):
        self.user = create_active_user(
            username="rece", email="rece@movilcare.test"
        )
        grant_crud(self.user, "/api/service-orders/", "/api/service-orders/1/")
        grant_crud(self.user, "/api/diagnostics/", "/api/diagnostics/1/")
        grant_crud(
            self.user, "/api/part-consumptions/", "/api/part-consumptions/1/"
        )
        self.client.force_authenticate(user=self.user)

        self.customer = Customer.objects.create(
            name="Cliente Taller",
            document_number="2011122233",
            status=RecordStatus.ACTIVE,
        )
        self.product = Product.objects.create(
            sku="MOV-020",
            name="Laptop",
            price=Decimal("500.00"),
            status=RecordStatus.ACTIVE,
        )
        self.unit = SerializedUnit.objects.create(
            product=self.product, serial="SN-LAP-01", status=RecordStatus.ACTIVE
        )
        self.part = Part.objects.create(
            name="Teclado",
            price=Decimal("25.00"),
            stock=5,
            status=RecordStatus.ACTIVE,
        )

    def _order_payload(self, **overrides):
        payload = {
            "customer_id": self.customer.id,
            "serialized_unit_id": self.unit.id,
            "open_date": "2026-11-01",
        }
        payload.update(overrides)
        return payload

    def test_order_create_generates_number_and_defaults(self):
        response = self.client.post(
            "/api/service-orders/", self._order_payload(), format="json"
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data["number"].startswith("OS-"))
        self.assertEqual(Decimal(str(response.data["total"])), Decimal("0.00"))
        self.assertEqual(response.data["status"], RecordStatus.INACTIVE)
        self.assertEqual(response.data["customer_name"], "Cliente Taller")
        self.assertEqual(response.data["unit_serial"], "SN-LAP-01")

        # El número es único.
        second = self.client.post(
            "/api/service-orders/", self._order_payload(), format="json"
        )
        self.assertEqual(second.status_code, 201)
        self.assertNotEqual(second.data["number"], response.data["number"])

    def test_order_close_before_open_is_rejected(self):
        response = self.client.post(
            "/api/service-orders/",
            self._order_payload(open_date="2026-11-10", close_date="2026-11-01"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(ServiceOrder.objects.count(), 0)

    def test_order_filter_by_customer_and_soft_delete(self):
        created = self.client.post(
            "/api/service-orders/", self._order_payload(), format="json"
        )
        pk = created.data["id"]

        listed = self.client.get(
            "/api/service-orders/", {"customer": self.customer.id}
        )
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]["id"], pk)

        other = Customer.objects.create(
            name="Otro Cliente",
            document_number="2044455566",
            status=RecordStatus.ACTIVE,
        )
        self.assertEqual(
            self.client.get(
                "/api/service-orders/", {"customer": other.id}
            ).status_code,
            200,
        )
        self.assertEqual(len(self.client.get("/api/service-orders/").data), 1)

        deleted = self.client.delete(f"/api/service-orders/{pk}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(
            ServiceOrder.objects.get(pk=pk).status, RecordStatus.INACTIVE
        )

    def test_diagnosis_crud_and_filter(self):
        order = self.client.post(
            "/api/service-orders/", self._order_payload(), format="json"
        ).data

        created = self.client.post(
            "/api/diagnostics/",
            {
                "service_order_id": order["id"],
                "description": "Pantalla rota",
                "diagnosis_date": "2026-11-02",
                "observations": "Requiere repuesto",
            },
            format="json",
        )

        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["service_order_number"], order["number"])
        self.assertEqual(created.data["status"], RecordStatus.INACTIVE)

        listed = self.client.get(
            "/api/diagnostics/", {"service_order": order["id"]}
        )
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)

        pk = created.data["id"]
        updated = self.client.patch(
            f"/api/diagnostics/{pk}/", {"status": "active"}, format="json"
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["status"], RecordStatus.ACTIVE)

        deleted = self.client.delete(f"/api/diagnostics/{pk}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(
            Diagnosis.objects.get(pk=pk).status, RecordStatus.INACTIVE
        )

    def test_consumption_recomputes_order_total(self):
        order = self.client.post(
            "/api/service-orders/", self._order_payload(), format="json"
        ).data

        # Alta sin unit_price: se toma el precio vigente del repuesto.
        # La línea nace activa para que entre en el total de la orden.
        created = self.client.post(
            "/api/part-consumptions/",
            {
                "service_order_id": order["id"],
                "part_id": self.part.id,
                "quantity": 2,
                "status": "active",
            },
            format="json",
        )

        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["status"], RecordStatus.ACTIVE)
        self.assertEqual(Decimal(str(created.data["subtotal"])), Decimal("50.00"))

        stored = ServiceOrder.objects.get(pk=order["id"])
        self.assertEqual(stored.total, Decimal("50.00"))

        # Baja lógica del consumo: el total vuelve a cero.
        deleted = self.client.delete(
            f"/api/part-consumptions/{created.data['id']}/"
        )
        self.assertEqual(deleted.status_code, 204)

        stored.refresh_from_db()
        self.assertEqual(stored.total, Decimal("0.00"))
        self.assertEqual(
            PartConsumption.objects.get(pk=created.data["id"]).status,
            RecordStatus.INACTIVE,
        )

    def test_consumption_requires_active_part(self):
        inactive_part = Part.objects.create(
            name="Carcasa",
            price=Decimal("10.00"),
            status=RecordStatus.INACTIVE,
        )
        order = self.client.post(
            "/api/service-orders/", self._order_payload(), format="json"
        ).data

        response = self.client.post(
            "/api/part-consumptions/",
            {
                "service_order_id": order["id"],
                "part_id": inactive_part.id,
                "quantity": 1,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(PartConsumption.objects.count(), 0)

    def test_missing_grant_is_403(self):
        other = create_active_user(
            username="sintaller", email="sintaller@movilcare.test"
        )
        self.client.force_authenticate(user=other)

        denied = self.client.get("/api/service-orders/")
        self.assertEqual(denied.status_code, 403)
