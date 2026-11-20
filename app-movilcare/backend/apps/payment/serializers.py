from decimal import Decimal

from rest_framework import serializers

from apps.payment.models import Payment, ReferenceType
from apps.sale.models import Sale
from apps.service.models import ServiceOrder


class PaymentSerializer(serializers.ModelSerializer):
    """Pago con referencia polimórfica (modelo.md: referencia_tipo/id).

    No hay FK: el par tipo+id se valida contra `Sale` u `ServiceOrder`
    según `reference_type`.
    """

    class Meta:
        model = Payment
        fields = [
            "id",
            "reference_type",
            "reference_id",
            "method",
            "amount",
            "payment_date",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "amount": {"min_value": Decimal("0.01")},
        }

    def validate(self, attrs):
        reference_type = attrs.get(
            "reference_type",
            self.instance.reference_type if self.instance else None,
        )
        reference_id = attrs.get(
            "reference_id",
            self.instance.reference_id if self.instance else None,
        )

        if reference_type and reference_id:
            model = Sale if reference_type == ReferenceType.SALE else ServiceOrder
            if not model.objects.filter(pk=reference_id).exists():
                raise serializers.ValidationError(
                    {
                        "reference_id": (
                            "La venta referenciada no existe."
                            if reference_type == ReferenceType.SALE
                            else "La orden de servicio referenciada no existe."
                        )
                    }
                )
        return attrs
