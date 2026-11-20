from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.customer.models import Customer
from apps.payment.models import Payment
from apps.product.models import Part, Product, SerializedUnit
from apps.sale.models import Sale, Warranty
from apps.service.models import Diagnosis, PartConsumption, ServiceOrder


class SeedDemoTests(TestCase):
    """`seed_demo` puebla las once entidades y se puede repetir sin duplicar."""

    def _seed(self) -> str:
        out = StringIO()
        call_command("seed_demo", stdout=out)
        return out.getvalue()

    def test_populates_every_entity(self):
        self._seed()

        # Cifras del seed sobre base vacía (el entorno dev puede tener filas
        # previas, de ahí que este test no dependa de ellas).
        self.assertEqual(Customer.objects.count(), 6)
        self.assertEqual(Product.objects.count(), 5)
        self.assertEqual(SerializedUnit.objects.count(), 11)
        self.assertEqual(Part.objects.count(), 5)
        self.assertEqual(Sale.objects.count(), 6)
        self.assertEqual(Warranty.objects.count(), 4)
        self.assertEqual(ServiceOrder.objects.count(), 4)
        self.assertEqual(Diagnosis.objects.count(), 5)
        self.assertEqual(PartConsumption.objects.count(), 5)
        self.assertEqual(Payment.objects.count(), 9)

    def test_second_run_is_idempotent(self):
        first = self._seed()
        counts_before = {
            "customers": Customer.objects.count(),
            "sales": Sale.objects.count(),
            "orders": ServiceOrder.objects.count(),
            "payments": Payment.objects.count(),
        }

        second = self._seed()

        self.assertEqual(counts_before, {
            "customers": Customer.objects.count(),
            "sales": Sale.objects.count(),
            "orders": ServiceOrder.objects.count(),
            "payments": Payment.objects.count(),
        })
        # La segunda pasada no registra altas: todo en +0.
        self.assertNotIn("+1", second)
        self.assertIn("+6", first)

    def test_sale_totals_match_their_active_lines(self):
        self._seed()

        for sale in Sale.objects.filter(status="active"):
            active = sale.lines.filter(status="active")
            expected = sum(line.line_total for line in active)
            self.assertEqual(sale.total, expected, f"venta {sale.pk}")

    def test_order_total_matches_active_consumptions(self):
        self._seed()

        for order in ServiceOrder.objects.all():
            expected = sum(
                consumption.subtotal
                for consumption in order.part_consumptions.filter(
                    status="active"
                )
            )
            self.assertEqual(order.total, expected, f"orden {order.number}")
