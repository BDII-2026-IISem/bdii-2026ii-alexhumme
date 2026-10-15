from drf_spectacular.utils import extend_schema
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.common.status import RecordStatus
from apps.security.models import Resource, ResourceRole, Role, RoleUser, User
from apps.security.permissions import HasResourceAccess
from apps.security.serializers import (
    ProfileSerializer,
    ResourceRoleSerializer,
    ResourceSerializer,
    RoleSerializer,
    RoleUserSerializer,
    UserSerializer,
)


class ProfileAPIView(RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    @extend_schema(responses={200: ProfileSerializer}, tags=["auth"])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(request=ProfileSerializer, responses={200: ProfileSerializer}, tags=["auth"])
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    def get_object(self):
        return self.request.user


class SoftDeleteModelViewSet(ModelViewSet):
    """ModelViewSet con baja lógica y filtro ?status= para la matriz RBAC."""

    lookup_value_converter = "int"

    def get_queryset(self):
        queryset = super().get_queryset()
        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset

    def perform_destroy(self, instance):
        # La fila nunca se borra: queda inactive.
        # save() completo para que User sincronice is_active con status.
        instance.status = RecordStatus.INACTIVE
        instance.save()


class UserViewSet(SoftDeleteModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, HasResourceAccess]


class RoleViewSet(SoftDeleteModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, HasResourceAccess]


class RoleUserViewSet(SoftDeleteModelViewSet):
    queryset = RoleUser.objects.all()
    serializer_class = RoleUserSerializer
    permission_classes = [IsAuthenticated, HasResourceAccess]


class ResourceViewSet(SoftDeleteModelViewSet):
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    permission_classes = [IsAuthenticated, HasResourceAccess]


class ResourceRoleViewSet(SoftDeleteModelViewSet):
    queryset = ResourceRole.objects.all()
    serializer_class = ResourceRoleSerializer
    permission_classes = [IsAuthenticated, HasResourceAccess]
