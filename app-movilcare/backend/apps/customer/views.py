from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.common.status import RecordStatus
from apps.customer.models import Customer
from apps.customer.serializers import CustomerSerializer
from apps.security.permissions import HasResourceAccess


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
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