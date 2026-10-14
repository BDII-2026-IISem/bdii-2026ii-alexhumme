from decimal import Decimal
from unittest.mock import patch

from django.utils import timezone
from rest_framework.test import APITestCase

from apps.customer.models import Customer
from apps.common.status import RecordStatus
from apps.product.models import Product
from apps.sale.models import Sale, SaleDetail


class SaleTransactionTests(APITestCase):
    def setUp(self):
        self.customer = Customer.objects.create(
            name="Comprador",
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

    def _payload(self, items, discounts="0.00"):
        return {
            "customer_id": self.customer.id,
            "sale_date": timezone.now().isoformat(),
            "discounts": discounts,
            "items": items,
        }

    def test_register_snapshots_prices_and_applies_discounts(self):
        response = self.client.post(
            "/api/sales/",
            self._payload(
                [
                    {
                        "product_id": self.water.id,
                        "quantity": 2,
                    },
                    {
                        "product_id": self.bread.id,
                        "quantity": 1,
                    },
                ],
                discounts="1.50",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(Decimal(str(response.data["subtotal"])), Decimal("24.50"))
        self.assertEqual(Decimal(str(response.data["tax"])), Decimal("0.00"))
        self.assertEqual(Decimal(str(response.data["discounts"])), Decimal("1.50"))
        self.assertEqual(Decimal(str(response.data["total"])), Decimal("23.00"))
        self.assertEqual(response.data["status"], "active")

        sale = Sale.objects.get(pk=response.data["id"])
        details = SaleDetail.objects.filter(sale=sale)

        self.assertEqual(details.count(), 2)

        water_detail = details.get(product=self.water)
        self.assertEqual(water_detail.quantity, 2)
        self.assertEqual(water_detail.unit_price, Decimal("10.00"))
        self.assertEqual(water_detail.line_total, Decimal("20.00"))

    def test_discount_cannot_exceed_subtotal(self):
        response = self.client.post(
            "/api/sales/",
            self._payload(
                [
                    {
                        "product_id": self.bread.id,
                        "quantity": 1,
                    }
                ],
                discounts="5.00",
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(SaleDetail.objects.count(), 0)

    def test_detail_creation_failure_rolls_back_the_sale(self):
        with patch.object(
            SaleDetail.objects,
            "create",
            side_effect=RuntimeError("Fallo al crear el detalle"),
        ):
            with self.assertRaises(RuntimeError):
                self.client.post(
                    "/api/sales/",
                    self._payload(
                        [
                            {
                                "product_id": self.water.id,
                                "quantity": 1,
                            }
                        ]
                    ),
                    format="json",
                )

        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(SaleDetail.objects.count(), 0)

    def test_inactive_customer_is_rejected(self):
        self.customer.status = RecordStatus.INACTIVE
        self.customer.save()

        response = self.client.post(
            "/api/sales/",
            self._payload(
                [
                    {
                        "product_id": self.water.id,
                        "quantity": 1,
                    }
                ]
            ),
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