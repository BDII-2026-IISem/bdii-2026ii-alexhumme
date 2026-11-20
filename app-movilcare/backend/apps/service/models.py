from decimal import Decimal
from uuid import uuid4

from django.db import models
from django.db.models import Sum
from django.utils import timezone

from apps.common.models import StoreLabModel
from apps.common.status import RecordStatus
from apps.customer.models import Customer
from apps.product.models import Part, SerializedUnit


def _generate_number():
    """Número de orden único: OS-<YYMMDD>-<6 hex aleatorios>."""
    stamp = timezone.now().strftime("%y%m%d")
    return f"OS-{stamp}-{uuid4().hex[:6].upper()}"


class ServiceOrder(StoreLabModel):
    """Orden de recepción/técnica (modelo.md: OrdenServicio).

    `status` traduce el `estado` del modelo a la baja lógica del proyecto;
    el cierre operativo se registra en `close_date`, no en el estado.
    `total` es la suma de los consumos de repuestos activos de la orden.
    """

    customer = models.ForeignKey(
        Customer,
        on_delete=models.RESTRICT,
        related_name="service_orders",
        db_column="customer_id",
    )
    serialized_unit = models.ForeignKey(
        SerializedUnit,
        on_delete=models.RESTRICT,
        related_name="service_orders",
        db_column="serialized_unit_id",
    )
    number = models.CharField(max_length=30, unique=True, blank=True, default="")
    open_date = models.DateField()
    close_date = models.DateField(null=True, blank=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        db_table = "service_orders"
        verbose_name = "orden de servicio"
        verbose_name_plural = "órdenes de servicio"
        ordering = ["-open_date", "-id"]
        constraints = [
            StoreLabModel.status_constraint("service_orders_status_valid"),
            models.CheckConstraint(
                condition=models.Q(close_date__isnull=True)
                | models.Q(close_date__gte=models.F("open_date")),
                name="service_orders_dates_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(total__gte=0),
                name="service_orders_total_non_neg",
            ),
        ]

    def __str__(self):
        return self.number or f"Orden {self.pk}"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = _generate_number()
        super().save(*args, **kwargs)

    def recompute_total(self):
        """Recalcula `total` como la suma de los consumos activos."""
        result = (
            self.part_consumptions
            .filter(status=RecordStatus.ACTIVE)
            .aggregate(amount=Sum("subtotal"))
        )
        total = Decimal(result["amount"] or "0.00").quantize(Decimal("0.01"))
        if total != self.total:
            self.total = total
            self.save(update_fields=["total", "updated_at"])


class Diagnosis(StoreLabModel):
    """Diagnóstico técnico de una orden (modelo.md: Diagnostico)."""

    service_order = models.ForeignKey(
        ServiceOrder,
        on_delete=models.RESTRICT,
        related_name="diagnoses",
        db_column="service_order_id",
    )
    description = models.CharField(max_length=255)
    diagnosis_date = models.DateField()
    observations = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "diagnoses"
        verbose_name = "diagnóstico"
        verbose_name_plural = "diagnósticos"
        ordering = ["-diagnosis_date", "-id"]
        constraints = [StoreLabModel.status_constraint("diagnoses_status_valid")]

    def __str__(self):
        return f"Diagnóstico {self.pk}"


class PartConsumption(StoreLabModel):
    """Consumo de repuesto en una orden (modelo.md: ConsumoRepuesto).

    Relación N:M entre orden y repuesto: `quantity` × `unit_price` =
    `subtotal`, y el total de la orden se recalcula en cada cambio.
    """

    service_order = models.ForeignKey(
        ServiceOrder,
        on_delete=models.RESTRICT,
        related_name="part_consumptions",
        db_column="service_order_id",
    )
    part = models.ForeignKey(
        Part,
        on_delete=models.RESTRICT,
        related_name="consumptions",
        db_column="part_id",
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        db_table = "part_consumptions"
        verbose_name = "consumo de repuesto"
        verbose_name_plural = "consumos de repuestos"
        ordering = ["id"]
        constraints = [
            StoreLabModel.status_constraint("part_consumptions_status_valid"),
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1)
                & models.Q(unit_price__gte=0)
                & models.Q(subtotal__gte=0),
                name="part_consumptions_amounts_valid",
            ),
        ]

    def __str__(self):
        return f"{self.part} x {self.quantity}"

    def save(self, *args, **kwargs):
        self.subtotal = (self.unit_price * self.quantity).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)
        self.service_order.recompute_total()

    def delete(self, *args, **kwargs):
        result = super().delete(*args, **kwargs)
        self.service_order.recompute_total()
        return result
