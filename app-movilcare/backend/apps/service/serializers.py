from rest_framework import serializers

from apps.common.status import RecordStatus
from apps.customer.models import Customer
from apps.product.models import Part, SerializedUnit
from apps.service.models import Diagnosis, PartConsumption, ServiceOrder


class ServiceOrderSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        source="customer",
        queryset=Customer.objects.all(),
    )
    serialized_unit_id = serializers.PrimaryKeyRelatedField(
        source="serialized_unit",
        queryset=SerializedUnit.objects.all(),
    )
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    unit_serial = serializers.CharField(
        source="serialized_unit.serial", read_only=True
    )
    product_name = serializers.CharField(
        source="serialized_unit.product.name", read_only=True
    )

    class Meta:
        model = ServiceOrder
        fields = [
            "id",
            "customer_id",
            "customer_name",
            "serialized_unit_id",
            "unit_serial",
            "product_name",
            "number",
            "open_date",
            "close_date",
            "total",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "number", "total", "created_at", "updated_at"]

    def validate(self, attrs):
        open_date = attrs.get(
            "open_date", self.instance.open_date if self.instance else None
        )
        close_date = attrs.get(
            "close_date", self.instance.close_date if self.instance else None
        )
        if open_date and close_date and close_date < open_date:
            raise serializers.ValidationError(
                {"close_date": "La fecha de cierre no puede ser anterior a la apertura."}
            )
        return attrs


class DiagnosisSerializer(serializers.ModelSerializer):
    service_order_id = serializers.PrimaryKeyRelatedField(
        source="service_order",
        queryset=ServiceOrder.objects.all(),
    )
    service_order_number = serializers.CharField(
        source="service_order.number", read_only=True
    )

    class Meta:
        model = Diagnosis
        fields = [
            "id",
            "service_order_id",
            "service_order_number",
            "description",
            "diagnosis_date",
            "observations",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "observations": {
                "required": False,
                "allow_null": True,
                "allow_blank": True,
            },
        }

    def validate_observations(self, value):
        if value is None or str(value).strip() == "":
            return None
        return value


class PartConsumptionSerializer(serializers.ModelSerializer):
    service_order_id = serializers.PrimaryKeyRelatedField(
        source="service_order",
        queryset=ServiceOrder.objects.all(),
    )
    part_id = serializers.PrimaryKeyRelatedField(
        source="part",
        queryset=Part.objects.all(),
    )
    part_name = serializers.CharField(source="part.name", read_only=True)
    service_order_number = serializers.CharField(
        source="service_order.number", read_only=True
    )

    class Meta:
        model = PartConsumption
        fields = [
            "id",
            "service_order_id",
            "service_order_number",
            "part_id",
            "part_name",
            "quantity",
            "unit_price",
            "subtotal",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "subtotal",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "quantity": {"min_value": 1},
            "unit_price": {"min_value": 0, "required": False},
        }

    def validate(self, attrs):
        part = attrs.get("part") or (self.instance.part if self.instance else None)

        if part is not None and part.status != RecordStatus.ACTIVE:
            raise serializers.ValidationError(
                {"part_id": "El repuesto debe estar activo."}
            )

        # Alta sin precio explícito: se toma el precio vigente del repuesto.
        if "unit_price" not in attrs:
            if self.instance is not None:
                attrs["unit_price"] = self.instance.unit_price
            elif part is not None:
                attrs["unit_price"] = part.price

        return attrs
