from django.urls import path
from rest_framework.routers import SimpleRouter

from apps.sale.views import (
    SaleCollectionAPIView,
    SaleReadViewSet,
    WarrantyViewSet,
)

router = SimpleRouter(use_regex_path=False)
router.register(
    r"warranties",
    WarrantyViewSet,
    basename="warranty",
)

urlpatterns = [
    path("sales/", SaleCollectionAPIView.as_view(), name="sale-collection"),
    path(
        "sales/<int:pk>/",
        SaleReadViewSet.as_view({"get": "retrieve", "delete": "destroy"}),
        name="sale-detail",
    ),
]
urlpatterns += router.urls
