from decimal import Decimal
from unittest.mock import patch

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.common.status import RecordStatus
from apps.common.testing import create_active_user, grant, grant_crud
from apps.customer.models import Customer
from apps.product.models import Product, SerializedUnit
from apps.sale.models import Sale, SaleDetail, Warranty


class SaleTransactionTests(APITestCase):
    def setUp(self):
        self.user = create_active_user(username="leo", email="leo@movilcare.test")
        grant(self.user, "GET", "/api/sales/")
        grant(self.user, "POST", "/api/sales/")
        grant(self.user, "GET", "/api/sales/1/")
        grant(self.user, "DELETE", "/api/sales/1/")
        self.client.force_authenticate(user=self.user)

        self.customer = Customer.objects.create(
            name="Comprador",
            document_number="1098000112",
            status=RecordStatus.ACTIVE,
        )

        self.water = Product.objects.create(
            sku="MOV-001",
            name="Agua",
            price=Decimal("10.00"),
            status=RecordStatus.ACTIVE,
        )

        self.bread = Product.objects.create(
            sku="MOV-002",
            name="Pan",
            price=Decimal("4.50"),
            status=RecordStatus.ACTIVE,
        )

        # Producto inactivo con una unidad activa: la venta debe rechazarse
        # por el producto, no por la unidad.
        self.retired = Product.objects.create(
            sku="MOV-003",
            name="Café",
            price=Decimal("7.00"),
            status=RecordStatus.INACTIVE,
        )

        self.water_unit = SerializedUnit.objects.create(
            product=self.water, serial="SN-AGUA-01", status=RecordStatus.ACTIVE
        )
        self.water_unit_2 = SerializedUnit.objects.create(
            product=self.water, serial="SN-AGUA-02", status=RecordStatus.ACTIVE
        )
        self.bread_unit = SerializedUnit.objects.create(
            product=self.bread, serial="SN-PAN-01", status=RecordStatus.ACTIVE
        )
        self.inactive_unit = SerializedUnit.objects.create(
            product=self.water, serial="SN-AGUA-03", status=RecordStatus.INACTIVE
        )
        self.retired_unit = SerializedUnit.objects.create(
            product=self.retired, serial="SN-CAFE-01", status=RecordStatus.ACTIVE
        )

    def _payload(self, unit_ids):
        return {
            "customer_id": self.customer.id,
            "sale_date": timezone.now().isoformat(),
            "items": [
                {"serialized_unit_id": unit_id} for unit_id in unit_ids
            ],
        }

    def test_register_snapshots_prices_of_each_serial(self):
        response = self.client.post(
            "/api/sales/",
            self._payload(
                [self.water_unit.id, self.water_unit_2.id, self.bread_unit.id]
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Decimal(str(response.data["subtotal"])), Decimal("24.50"))
        self.assertEqual(Decimal(str(response.data["tax"])), Decimal("0.00"))
        self.assertEqual(Decimal(str(response.data["total"])), Decimal("24.50"))
        self.assertEqual(response.data["status"], "active")

        sale = Sale.objects.get(pk=response.data["id"])
        details = list(sale.lines.order_by("id"))

        self.assertEqual(len(details), 3)
        # Una línea por unidad serializada, cantidad 1.
        self.assertEqual(
            [detail.serialized_unit_id for detail in details],
            [self.water_unit.id, self.water_unit_2.id, self.bread_unit.id],
        )
        for detail in details:
            self.assertEqual(detail.quantity, 1)

        self.assertEqual(details[0].unit_price, Decimal("10.00"))
        self.assertEqual(details[0].line_total, Decimal("10.00"))
        self.assertEqual(details[2].unit_price, Decimal("4.50"))
        self.assertEqual(details[2].line_total, Decimal("4.50"))

    def test_duplicate_serial_in_the_same_sale_is_rejected(self):
        response = self.client.post(
            "/api/sales/",
            self._payload([self.water_unit.id, self.water_unit.id]),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(SaleDetail.objects.count(), 0)

    def test_inactive_unit_is_rejected(self):
        response = self.client.post(
            "/api/sales/",
            self._payload([self.inactive_unit.id]),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Sale.objects.count(), 0)

    def test_unit_of_inactive_product_is_rejected(self):
        response = self.client.post(
            "/api/sales/",
            self._payload([self.retired_unit.id]),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Sale.objects.count(), 0)

    def test_detail_creation_failure_rolls_back_the_sale(self):
        with patch.object(
            SaleDetail.objects,
            "create",
            side_effect=RuntimeError("Fallo al crear el detalle"),
        ):
            with self.assertRaises(RuntimeError):
                self.client.post(
                    "/api/sales/",
                    self._payload([self.water_unit.id]),
                    format="json",
                )

        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(SaleDetail.objects.count(), 0)

    def test_inactive_customer_is_rejected(self):
        self.customer.status = RecordStatus.INACTIVE
        self.customer.save()

        response = self.client.post(
            "/api/sales/",
            self._payload([self.water_unit.id]),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(SaleDetail.objects.count(), 0)

    def test_empty_items_are_rejected(self):
        response = self.client.post(
            "/api/sales/",
            self._payload([]),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(SaleDetail.objects.count(), 0)

    def test_detail_keeps_historical_price(self):
        created = self.client.post(
            "/api/sales/",
            self._payload([self.water_unit.id]),
            format="json",
        )

        # El precio vivo del catálogo cambia, pero la venta guarda el suyo.
        Product.objects.filter(pk=self.water.pk).update(price=Decimal("99.00"))

        detail = self.client.get(f"/api/sales/{created.data['id']}/")

        self.assertEqual(detail.status_code, 200)
        self.assertEqual(len(detail.data["lines"]), 1)
        line = detail.data["lines"][0]
        self.assertEqual(Decimal(str(line["unit_price"])), Decimal("10.00"))
        self.assertEqual(Decimal(str(line["line_total"])), Decimal("10.00"))
        # La línea expone el serial vendido y el producto del catálogo.
        self.assertEqual(line["serialized_unit_serial"], "SN-AGUA-01")
        self.assertEqual(line["product_name"], "Agua")

    def test_list_returns_the_registered_sale(self):
        created = self.client.post(
            "/api/sales/",
            self._payload([self.water_unit.id]),
            format="json",
        )

        listed = self.client.get("/api/sales/")

        self.assertEqual(listed.status_code, 200)
        self.assertTrue(
            any(row["id"] == created.data["id"] for row in listed.data)
        )

    def test_void_marks_sale_and_lines_inactive(self):
        created = self.client.post(
            "/api/sales/",
            self._payload([self.water_unit.id]),
            format="json",
        )
        sale_id = created.data["id"]

        response = self.client.delete(f"/api/sales/{sale_id}/")

        self.assertEqual(response.status_code, 204)

        sale = Sale.objects.get(pk=sale_id)
        self.assertEqual(sale.status, RecordStatus.INACTIVE)
        self.assertEqual(sale.lines.count(), 1)
        self.assertFalse(
            sale.lines.filter(status=RecordStatus.ACTIVE).exists()
        )

    def test_void_is_idempotent(self):
        created = self.client.post(
            "/api/sales/",
            self._payload([self.water_unit.id]),
            format="json",
        )
        sale_id = created.data["id"]

        first = self.client.delete(f"/api/sales/{sale_id}/")
        second = self.client.delete(f"/api/sales/{sale_id}/")

        # MovilCare no repone stock, así que el segundo borrado no tiene
        # nada que reponer: simplemente no vuelve a tocar nada.
        self.assertEqual(first.status_code, 204)
        self.assertEqual(second.status_code, 204)

        sale = Sale.objects.get(pk=sale_id)
        self.assertEqual(sale.status, RecordStatus.INACTIVE)
        self.assertFalse(
            sale.lines.filter(status=RecordStatus.ACTIVE).exists()
        )
        self.assertEqual(Sale.objects.count(), 1)
        self.assertEqual(SaleDetail.objects.count(), 1)


class WarrantyApiTests(APITestCase):
    """Garantías: CRUD, filtro por venta y PATCH (recurso de modelo.md)."""

    def setUp(self):
        self.user = create_active_user(
            username="gari", email="gari@movilcare.test"
        )
        grant_crud(self.user, "/api/warranties/", "/api/warranties/1/")
        self.client.force_authenticate(user=self.user)

        self.customer = Customer.objects.create(
            name="Comprador",
            document_number="1098000223",
            status=RecordStatus.ACTIVE,
        )
        self.product = Product.objects.create(
            sku="MOV-010",
            name="Tablet",
            price=Decimal("100.00"),
            status=RecordStatus.ACTIVE,
        )
        self.unit = SerializedUnit.objects.create(
            product=self.product, serial="SN-TAB-01", status=RecordStatus.ACTIVE
        )
        self.sale = Sale.objects.register(
            customer=self.customer,
            sale_date=timezone.now(),
            unit_ids=[self.unit.id],
        )
        self.line = self.sale.lines.get()

    def _payload(self, **overrides):
        payload = {
            "sale_detail_id": self.line.id,
            "start_date": "2026-01-01",
            "end_date": "2027-01-01",
            "warranty_type": "commercial",
            "description": "Garantía de fábrica",
        }
        payload.update(overrides)
        return payload

    def test_warranty_crud_and_defaults(self):
        created = self.client.post(
            "/api/warranties/", self._payload(), format="json"
        )

        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["status"], RecordStatus.INACTIVE)
        self.assertEqual(created.data["sale_id"], self.sale.id)
        self.assertEqual(created.data["serialized_unit_serial"], "SN-TAB-01")

        pk = created.data["id"]
        self.assertEqual(self.client.get(f"/api/warranties/{pk}/").status_code, 200)

        # PATCH /warranties/:id es el recurso de referencia de modelo.md.
        updated = self.client.patch(
            f"/api/warranties/{pk}/",
            {"status": "active", "warranty_type": "extended"},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["status"], RecordStatus.ACTIVE)
        self.assertEqual(updated.data["warranty_type"], "extended")

        deleted = self.client.delete(f"/api/warranties/{pk}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(
            Warranty.objects.get(pk=pk).status, RecordStatus.INACTIVE
        )

    def test_end_date_before_start_date_is_rejected(self):
        response = self.client.post(
            "/api/warranties/",
            self._payload(start_date="2026-05-01", end_date="2026-04-01"),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Warranty.objects.count(), 0)

    def test_filter_by_sale_returns_only_its_lines(self):
        other_customer = Customer.objects.create(
            name="Otro",
            document_number="1098000334",
            status=RecordStatus.ACTIVE,
        )
        other_unit = SerializedUnit.objects.create(
            product=self.product, serial="SN-TAB-02", status=RecordStatus.ACTIVE
        )
        other_sale = Sale.objects.register(
            customer=other_customer,
            sale_date=timezone.now(),
            unit_ids=[other_unit.id],
        )

        self.client.post(
            "/api/warranties/", self._payload(), format="json"
        )
        self.client.post(
            "/api/warranties/",
            self._payload(sale_detail_id=other_sale.lines.get().id),
            format="json",
        )

        listed = self.client.get("/api/warranties/", {"sale": self.sale.id})

        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]["sale_id"], self.sale.id)

    def test_missing_grant_is_403(self):
        other = create_active_user(
            username="sinwarr", email="sinwarr@movilcare.test"
        )
        self.client.force_authenticate(user=other)

        denied = self.client.get("/api/warranties/")
        self.assertEqual(denied.status_code, 403)
