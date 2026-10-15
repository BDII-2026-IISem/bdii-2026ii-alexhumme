from django.urls import path
from rest_framework.routers import SimpleRouter

from apps.product.views import ProductViewSet, SerializedUnitViewSet, ProductUnitsListAPIView

router = SimpleRouter(use_regex_path=False)
router.register(
    r"products",
    ProductViewSet,
    basename="product",
)

router.register(
    r"serialized-units",
    SerializedUnitViewSet,
    basename="serialized-unit",
)

urlpatterns = [
    path(
        "products/<int:product_id>/units/",
        ProductUnitsListAPIView.as_view(),
        name="product-units",
    ),
]
urlpatterns += router.urls