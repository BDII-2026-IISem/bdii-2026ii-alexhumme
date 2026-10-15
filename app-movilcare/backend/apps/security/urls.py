from django.urls import path

from apps.security.auth_views import LoginAPIView

urlpatterns = [
    path("auth/login/", LoginAPIView.as_view(), name="auth-login"),
]
