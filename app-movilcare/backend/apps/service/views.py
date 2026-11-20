from rest_framework.permissions import IsAuthenticated

from apps.common.views import SoftDeleteViewSet
from apps.security.permissions import HasResourceAccess
from apps.service.models import Diagnosis, PartConsumption, ServiceOrder
from apps.service.serializers import (
    DiagnosisSerializer,
    PartConsumptionSerializer,
    ServiceOrderSerializer,
)


class ServiceOrderViewSet(SoftDeleteViewSet):
    """Órdenes de servicio (POST /service-orders + CRUD).

    `?customer=` y `?serialized_unit=` filtran desde el panel maestro
    (por ejemplo, las órdenes de un cliente en su ficha).
    """

    queryset = ServiceOrder.objects.select_related(
        "customer", "serialized_unit__product"
    )
    serializer_class = ServiceOrderSerializer
    permission_classes = [IsAuthenticated, HasResourceAccess]

    def get_queryset(self):
        queryset = super().get_queryset()
        customer = self.request.query_params.get("customer")
        if customer:
            queryset = queryset.filter(customer_id=customer)
        serialized_unit = self.request.query_params.get("serialized_unit")
        if serialized_unit:
            queryset = queryset.filter(serialized_unit_id=serialized_unit)
        return queryset


class DiagnosisViewSet(SoftDeleteViewSet):
    """Diagnósticos técnicos (POST /diagnostics + CRUD)."""

    queryset = Diagnosis.objects.select_related("service_order")
    serializer_class = DiagnosisSerializer
    permission_classes = [IsAuthenticated, HasResourceAccess]

    def get_queryset(self):
        queryset = super().get_queryset()
        service_order = self.request.query_params.get("service_order")
        if service_order:
            queryset = queryset.filter(service_order_id=service_order)
        return queryset


class PartConsumptionViewSet(SoftDeleteViewSet):
    """Consumos de repuesto por orden (CRUD + filtro ?service_order=)."""

    queryset = PartConsumption.objects.select_related(
        "service_order", "part"
    )
    serializer_class = PartConsumptionSerializer
    permission_classes = [IsAuthenticated, HasResourceAccess]

    def get_queryset(self):
        queryset = super().get_queryset()
        service_order = self.request.query_params.get("service_order")
        if service_order:
            queryset = queryset.filter(service_order_id=service_order)
        part = self.request.query_params.get("part")
        if part:
            queryset = queryset.filter(part_id=part)
        return queryset
