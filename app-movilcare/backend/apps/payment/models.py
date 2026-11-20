from decimal import Decimal

from django.db import models

from apps.common.models import StoreLabModel


class ReferenceType(models.TextChoices):
    """Entidad a la que se aplica el pago (modelo.md: referencia_tipo)."""

    SALE = "sale", "Venta"
    SERVICE_ORDER = "service_order", "Orden de servicio"


class PaymentMethod(models.TextChoices):
    """Medio de pago (modelo.md: metodo)."""

    CASH = "cash", "Efectivo"
    CARD = "card", "Tarjeta"
    TRANSFER = "transfer", "Transferencia"
    MOBILE = "mobile", "Pago móvil"


class Payment(StoreLabModel):
    """Pago de una venta u orden de servicio (modelo.md: Pago).

    La referencia es polimórfica por diseño (`reference_type` +
    `reference_id`), sin FK: el par se valida en el serializer contra
    `Sale` u `ServiceOrder`.
    """

    reference_type = models.CharField(max_length=20, choices=ReferenceType.choices)
    reference_id = models.PositiveIntegerField()
    method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()

    class Meta:
        db_table = "payments"
        verbose_name = "pago"
        verbose_name_plural = "pagos"
        ordering = ["-payment_date", "-id"]
        constraints = [
            StoreLabModel.status_constraint("payments_status_valid"),
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name="payments_amount_positive",
            ),
        ]

    def __str__(self):
        return f"Pago {self.pk} ({self.get_method_display()})"
