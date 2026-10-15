from drf_spectacular.extensions import OpenApiAuthenticationExtension


class MovilCareJWTScheme(OpenApiAuthenticationExtension):
    """Publica el JWT de MovilCare como scheme bearerAuth en OpenAPI.

    En Swagger, Authorize recibe solo el valor del access token; no se pega
    la palabra Bearer porque el esquema ya es http / bearer.
    """

    target_class = "apps.security.authentication.MovilCareJWTAuthentication"
    name = "bearerAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
