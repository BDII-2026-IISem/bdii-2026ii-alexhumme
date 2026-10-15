from rest_framework.generics import ListAPIView
from rest_framework import viewsets
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated

from apps.common.status import RecordStatus
from apps.product.models import Product, SerializedUnit
from apps.product.serializers import ProductSerializer, SerializedUnitSerializer
from apps.security.permissions import HasResourceAccess


class CatalogViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasResourceAccess]
    lookup_value_converter = "int"

    def get_queryset(self):
        queryset = super().get_queryset()

        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)

        return queryset

    def perform_destroy(self, instance):
        instance.status = RecordStatus.INACTIVE
        instance.save(update_fields=["status", "updated_at"])

class ProductViewSet(CatalogViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class SerializedUnitViewSet(CatalogViewSet):
    queryset = SerializedUnit.objects.all()
    serializer_class = SerializedUnitSerializer

class ProductUnitsListAPIView(ListAPIView):
    """Lista las unidades serializadas de un producto concreto.

    GET /api/products/<product_id>/units/
    """

    permission_classes = [IsAuthenticated, HasResourceAccess]
    serializer_class = SerializedUnitSerializer

    def get_queryset(self):
        product = get_object_or_404(Product, pk=self.kwargs["product_id"])

        queryset = product.serialized_units.select_related("product")

        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)

        return queryset
