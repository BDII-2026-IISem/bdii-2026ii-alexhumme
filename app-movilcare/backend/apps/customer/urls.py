from rest_framework.routers import SimpleRouter

from apps.customer.views import CustomerViewSet

router = SimpleRouter(use_regex_path=False)
router.register("customers", CustomerViewSet, basename="customer")

urlpatterns = router.urls