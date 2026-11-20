from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone

from apps.customer.models import Customer
from apps.common.models import StoreLabModel
from apps.common.status import RecordStatus
from apps.product.models import SerializedUnit
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
    # Cada línea vende una unidad serializada concreta (modelo.md): el serial
    # es la trazabilidad del artículo vendido, no el producto del catálogo.
    serialized_unit = models.ForeignKey(
        SerializedUnit,
        on_delete=models.RESTRICT,
        related_name="sale_lines",
        db_column="serialized_unit_id",
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
        return f"{self.serialized_unit} x {self.quantity}"

    def save(self, *args, **kwargs):
        self.line_total = (self.unit_price * self.quantity).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)


class WarrantyType(models.TextChoices):
    """Tipo de garantía (modelo.md: `tipo`)."""

    COMMERCIAL = "commercial", "Garantía comercial"
    EXTENDED = "extended", "Garantía extendida"


class Warranty(StoreLabModel):
    """Garantía por artículo vendido (modelo.md: Garantia).

    Cuelga de la línea de venta: garantiza la unidad serializada que salió
    en esa línea. `status` traduce el `estado` del modelo (vigente /
    anulada); la vigencia temporal se deriva de `end_date`.
    """

    sale_detail = models.ForeignKey(
        "sale.SaleDetail",
        on_delete=models.RESTRICT,
        related_name="warranties",
        db_column="sale_detail_id",
    )
    start_date = models.DateField()
    end_date = models.DateField()
    warranty_type = models.CharField(
        max_length=20,
        choices=WarrantyType.choices,
        default=WarrantyType.COMMERCIAL,
    )
    description = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "warranties"
        verbose_name = "garantía"
        verbose_name_plural = "garantías"
        ordering = ["-start_date", "-id"]
        constraints = [
            StoreLabModel.status_constraint("warranties_status_valid"),
            models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="warranty_dates_valid",
            ),
        ]

    def __str__(self):
        return f"Garantía {self.pk} ({self.get_warranty_type_display()})"
