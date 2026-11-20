from rest_framework.permissions import IsAuthenticated

from apps.common.views import SoftDeleteViewSet
from apps.payment.models import Payment
from apps.payment.serializers import PaymentSerializer
from apps.security.permissions import HasResourceAccess


class PaymentViewSet(SoftDeleteViewSet):
    """Pagos de ventas y órdenes (CRUD + filtros de referencia).

    `?reference_type=sale|service_order&reference_id=<id>` devuelve los
    pagos de una venta u orden concreta (pestaña «Pagos»).
    """

    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, HasResourceAccess]

    def get_queryset(self):
        queryset = super().get_queryset()
        reference_type = self.request.query_params.get("reference_type")
        if reference_type:
            queryset = queryset.filter(reference_type=reference_type)
        reference_id = self.request.query_params.get("reference_id")
        if reference_id:
            queryset = queryset.filter(reference_id=reference_id)
        method = self.request.query_params.get("method")
        if method:
            queryset = queryset.filter(method=method)
        return queryset
