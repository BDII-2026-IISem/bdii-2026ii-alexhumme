from rest_framework.routers import SimpleRouter

from apps.service.views import (
    DiagnosisViewSet,
    PartConsumptionViewSet,
    ServiceOrderViewSet,
)

router = SimpleRouter(use_regex_path=False)
router.register("service-orders", ServiceOrderViewSet, basename="service-order")
router.register("diagnostics", DiagnosisViewSet, basename="diagnosis")
router.register(
    "part-consumptions", PartConsumptionViewSet, basename="part-consumption"
)

urlpatterns = router.urls
