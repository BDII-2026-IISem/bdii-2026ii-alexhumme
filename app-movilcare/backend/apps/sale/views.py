from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import GenericViewSet

from apps.sale.models import Sale
from apps.sale.serializers import SaleRegisterSerializer, SaleSerializer
from apps.security.permissions import HasResourceAccess


class SaleRegisterAPIView(APIView):
    permission_classes = [IsAuthenticated, HasResourceAccess]

    @extend_schema(
        request=SaleRegisterSerializer,
        responses={201: SaleSerializer},
        tags=["sales"],
    )
    def post(self, request):
        serializer = SaleRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sale = serializer.save()
        sale = Sale.objects.prefetch_related("lines__product").get(pk=sale.pk)
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)


class SaleReadViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    GenericViewSet,
):
    """Consulta y anulación de ventas.

    Mezcla solo los mixins de lectura y borrado: los totales no se editan
    por CRUD y el alta ya tiene su SaleRegisterAPIView, así que no se
    incluye create ni update.
    """

    queryset = Sale.objects.select_related("customer").prefetch_related(
        "lines__product"
    )
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated, HasResourceAccess]
    lookup_value_converter = "int"

    def perform_destroy(self, instance):
        # DELETE anula de forma lógica, nunca borra la fila.
        instance.void()


class SaleCollectionAPIView(APIView):
    permission_classes = [IsAuthenticated, HasResourceAccess]

    @extend_schema(
        responses={200: SaleSerializer(many=True)},
        tags=["sales"],
    )
    def get(self, request, *args, **kwargs):
        # GET reutiliza el queryset y el serializer del viewset ya montado,
        # en lugar de duplicarlos aquí.
        viewset = SaleReadViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        viewset.args = ()
        viewset.kwargs = {}
        return viewset.list(request, *args, **kwargs)

    @extend_schema(
        request=SaleRegisterSerializer,
        responses={201: SaleSerializer},
        tags=["sales"],
    )
    def post(self, request, *args, **kwargs):
        handler = SaleRegisterAPIView()
        handler.request = request
        handler.format_kwarg = None
        handler.args = ()
        handler.kwargs = {}
        return handler.post(request)