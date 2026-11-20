from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.customer.models import Customer
from apps.product.models import SerializedUnit
from apps.sale.models import Sale, SaleDetail, Warranty


class SaleItemSerializer(serializers.Serializer):
    """Línea de alta: una unidad serializada concreta (modelo.md)."""

    serialized_unit_id = serializers.PrimaryKeyRelatedField(
        queryset=SerializedUnit.objects.all(),
        source="serialized_unit",
    )


class SaleRegisterSerializer(serializers.Serializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source="customer",
    )
    sale_date = serializers.DateTimeField()
    items = SaleItemSerializer(many=True, allow_empty=False)

    def create(self, validated_data):
        unit_ids = [
            item["serialized_unit"].id for item in validated_data["items"]
        ]
        try:
            return Sale.objects.register(
                customer=validated_data["customer"],
                sale_date=validated_data["sale_date"],
                unit_ids=unit_ids,
            )
        except DjangoValidationError as exc:
            if getattr(exc, "message_dict", None):
                raise serializers.ValidationError(exc.message_dict) from exc
            raise serializers.ValidationError(exc.messages) from exc


class SaleDetailSerializer(serializers.ModelSerializer):
    serialized_unit_id = serializers.PrimaryKeyRelatedField(
        source="serialized_unit",
        read_only=True,
    )
    serialized_unit_serial = serializers.CharField(
        source="serialized_unit.serial", read_only=True
    )
    product_name = serializers.CharField(
        source="serialized_unit.product.name", read_only=True
    )

    class Meta:
        model = SaleDetail
        fields = [
            "id",
            "serialized_unit_id",
            "serialized_unit_serial",
            "product_name",
            "quantity",
            "unit_price",
            "line_total",
            "observations",
            "status",
            "created_at",
            "updated_at",
        ]


class SaleSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        source="customer",
        read_only=True,
    )
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    lines = SaleDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "customer_id",
            "customer_name",
            "sale_date",
            "subtotal",
            "tax",
            "total",
            "status",
            "lines",
            "created_at",
            "updated_at",
        ]


class WarrantySerializer(serializers.ModelSerializer):
    sale_detail_id = serializers.PrimaryKeyRelatedField(
        source="sale_detail",
        queryset=SaleDetail.objects.all(),
    )
    sale_id = serializers.IntegerField(source="sale_detail.sale_id", read_only=True)
    serialized_unit_serial = serializers.CharField(
        source="sale_detail.serialized_unit.serial", read_only=True
    )

    class Meta:
        model = Warranty
        fields = [
            "id",
            "sale_detail_id",
            "sale_id",
            "serialized_unit_serial",
            "start_date",
            "end_date",
            "warranty_type",
            "description",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "description": {
                "required": False,
                "allow_null": True,
                "allow_blank": True,
            },
        }

    def validate(self, attrs):
        start_date = attrs.get(
            "start_date", self.instance.start_date if self.instance else None
        )
        end_date = attrs.get(
            "end_date", self.instance.end_date if self.instance else None
        )
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "La fecha de fin no puede ser anterior al inicio."}
            )
        return attrs

    def validate_description(self, value):
        if value is None or str(value).strip() == "":
            return None
        return value
