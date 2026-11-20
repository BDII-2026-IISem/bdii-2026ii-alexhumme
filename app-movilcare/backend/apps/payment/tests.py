from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.common.status import RecordStatus
from apps.common.testing import create_active_user, grant_crud
from apps.customer.models import Customer
from apps.payment.models import Payment
from apps.product.models import Product, SerializedUnit
from apps.sale.models import Sale
from apps.service.models import ServiceOrder


class PaymentApiTests(APITestCase):
    def setUp(self):
        self.user = create_active_user(
            username="caja", email="caja@movilcare.test"
        )
        grant_crud(self.user, "/api/payments/", "/api/payments/1/")
        self.client.force_authenticate(user=self.user)

        self.customer = Customer.objects.create(
            name="Cliente Pago",
            document_number="3011122233",
            status=RecordStatus.ACTIVE,
        )
        self.product = Product.objects.create(
            sku="MOV-030",
            name="Audífonos",
            price=Decimal("40.00"),
            status=RecordStatus.ACTIVE,
        )
        self.unit = SerializedUnit.objects.create(
            product=self.product, serial="SN-AUD-01", status=RecordStatus.ACTIVE
        )
        self.sale = Sale.objects.register(
            customer=self.customer,
            sale_date=timezone.now(),
            unit_ids=[self.unit.id],
        )
        self.order = ServiceOrder.objects.create(
            customer=self.customer,
            serialized_unit=self.unit,
            open_date=timezone.now().date(),
            status=RecordStatus.ACTIVE,
        )

    def test_payment_for_sale(self):
        response = self.client.post(
            "/api/payments/",
            {
                "reference_type": "sale",
                "reference_id": self.sale.id,
                "method": "cash",
                "amount": "10.00",
                "payment_date": "2026-11-19",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["reference_type"], "sale")
        self.assertEqual(response.data["method"], "cash")
        self.assertEqual(response.data["status"], RecordStatus.INACTIVE)

        pk = response.data["id"]
        updated = self.client.patch(
            f"/api/payments/{pk}/", {"status": "active"}, format="json"
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["status"], RecordStatus.ACTIVE)

        deleted = self.client.delete(f"/api/payments/{pk}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(
            Payment.objects.get(pk=pk).status, RecordStatus.INACTIVE
        )

    def test_payment_for_service_order(self):
        response = self.client.post(
            "/api/payments/",
            {
                "reference_type": "service_order",
                "reference_id": self.order.id,
                "method": "transfer",
                "amount": "15.50",
                "payment_date": "2026-11-19",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["reference_type"], "service_order")

    def test_unknown_reference_is_rejected(self):
        response = self.client.post(
            "/api/payments/",
            {
                "reference_type": "sale",
                "reference_id": 999999,
                "method": "cash",
                "amount": "5.00",
                "payment_date": "2026-11-19",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Payment.objects.count(), 0)

    def test_invalid_reference_type_is_rejected(self):
        response = self.client.post(
            "/api/payments/",
            {
                "reference_type": "pedido",
                "reference_id": 1,
                "method": "cash",
                "amount": "5.00",
                "payment_date": "2026-11-19",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Payment.objects.count(), 0)

    def test_amount_must_be_positive(self):
        response = self.client.post(
            "/api/payments/",
            {
                "reference_type": "sale",
                "reference_id": self.sale.id,
                "method": "cash",
                "amount": "0.00",
                "payment_date": "2026-11-19",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Payment.objects.count(), 0)

    def test_filter_by_reference(self):
        self.client.post(
            "/api/payments/",
            {
                "reference_type": "sale",
                "reference_id": self.sale.id,
                "method": "cash",
                "amount": "10.00",
                "payment_date": "2026-11-19",
            },
            format="json",
        )
        self.client.post(
            "/api/payments/",
            {
                "reference_type": "service_order",
                "reference_id": self.order.id,
                "method": "card",
                "amount": "20.00",
                "payment_date": "2026-11-19",
            },
            format="json",
        )

        listed = self.client.get(
            "/api/payments/",
            {"reference_type": "sale", "reference_id": self.sale.id},
        )

        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]["reference_type"], "sale")
        self.assertEqual(
            Decimal(str(listed.data[0]["amount"])), Decimal("10.00")
        )
