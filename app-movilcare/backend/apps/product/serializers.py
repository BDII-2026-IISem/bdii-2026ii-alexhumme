from rest_framework import serializers

from apps.product.models import Product, SerializedUnit


class SerializedUnitSerializer(serializers.ModelSerializer):
    # Acepta las dos formas del mismo FK: "product_id" (canónica, y "productId"
    # tras el CamelCaseJSONParser) y "product". Ambas escriben sobre el
    # atributo "product" del modelo.
    product_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=Product.objects.all(),
        required=False,
    )
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=False,
    )
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = SerializedUnit
        fields = [
            "id",
            "product",
            "product_id",
            "product_name",
            "name",
            "description",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "product_name", "created_at", "updated_at"]
        extra_kwargs = {
            "name": {"min_length": 2, "max_length": 150},
            "description": {"required": False, "allow_null": True, "allow_blank": True},
        }

    def validate(self, attrs):
        # Ambos campos son opcionales por separado, pero al menos uno es
        # obligatorio para poder resolver el FK "product".
        if not attrs.get("product"):
            raise serializers.ValidationError(
                {"product_id": "Este campo es requerido."}
            )
        return attrs

    def validate_description(self, value):
        if value is None or str(value).strip() == "":
            return None
        return value


class ProductSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = [
            "id",
            "sku",
            "name",
            "description",
            "price",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "name": {"min_length": 2, "max_length": 120},
            "description": {"required": False, "allow_null": True, "allow_blank": True},
        }

    def validate_description(self, value):
        if value is None or str(value).strip() == "":
            return None
        return value