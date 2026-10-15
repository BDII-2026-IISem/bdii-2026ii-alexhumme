from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone

from apps.customer.models import Customer
from apps.common.models import StoreLabModel
from apps.common.status import RecordStatus
from apps.product.models import Product
from apps.sale.managers import SaleManager

class Sale(StoreLabModel):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.RESTRICT,
        related_name="sales",
        db_column="customer_id",
    )
    sale_date = models.DateTimeField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    discounts = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    objects = SaleManager()

    class Meta:
        db_table = "sales"
        verbose_name = "venta"
        verbose_name_plural = "ventas"
        ordering = ["-sale_date", "-id"]
        constraints = [
            StoreLabModel.status_constraint("sales_status_valid"),
            models.CheckConstraint(
                condition=models.Q(subtotal__gte=0)
                & models.Q(tax__gte=0)
                & models.Q(discounts__gte=0)
                & models.Q(total__gte=0),
                name="sales_amounts_non_neg",
            ),
        ]

    def __str__(self):
        return f"Venta {self.pk}"

    def void(self):
        """Anula la venta y sus líneas sin borrar ninguna fila.

        MovilCare no tiene columna de stock, así que la anulación no repone
        cantidad alguna: se limita a marcar la venta y sus líneas como
        inactivas. Es idempotente, una segunda llamada no vuelve a tocar nada.
        """
        with transaction.atomic():
            sale = Sale.objects.select_for_update().get(pk=self.pk)
            if sale.status == RecordStatus.INACTIVE:
                return sale
            sale.status = RecordStatus.INACTIVE
            sale.save(update_fields=["status", "updated_at"])
            sale.lines.filter(status=RecordStatus.ACTIVE).update(
                status=RecordStatus.INACTIVE,
                updated_at=timezone.now(),
            )
            return sale


class SaleDetail(StoreLabModel):
    sale = models.ForeignKey(
        Sale,
        on_delete=models.RESTRICT,
        related_name="lines",
        db_column="sale_id",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.RESTRICT,
        related_name="sale_lines",
        db_column="product_id",
    )
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    observations = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "sale_details"
        verbose_name = "detalle de venta"
        verbose_name_plural = "detalles de venta"
        ordering = ["id"]
        constraints = [
            StoreLabModel.status_constraint("sale_details_status_valid"),
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1)
                & models.Q(unit_price__gte=0)
                & models.Q(line_total__gte=0),
                name="psale_amounts_valid",
            ),
        ]

    def __str__(self):
        return f"{self.product} x {self.quantity}"

    def save(self, *args, **kwargs):
        self.line_total = (self.unit_price * self.quantity).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)