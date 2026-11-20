from rest_framework.viewsets import ModelViewSet

from apps.common.status import RecordStatus


class SoftDeleteViewSet(ModelViewSet):
    """ModelViewSet con baja lógica y filtro `?status=`.

    Convención del proyecto para las entidades de negocio: DELETE nunca
    borra la fila, la deja `inactive`.
    """

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
