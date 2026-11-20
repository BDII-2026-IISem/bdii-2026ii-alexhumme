from rest_framework.routers import SimpleRouter

from apps.payment.views import PaymentViewSet

router = SimpleRouter(use_regex_path=False)
router.register("payments", PaymentViewSet, basename="payment")

urlpatterns = router.urls
