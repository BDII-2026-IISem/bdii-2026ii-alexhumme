from django.apps import AppConfig


class SecurityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.security'
    label = 'security'

    def ready(self):
        # Registra la extensión bearerAuth de drf-spectacular.
        from apps.security import schema  # noqa: F401
