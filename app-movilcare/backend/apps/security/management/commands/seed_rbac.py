from django.core.management.base import BaseCommand, CommandError
from django.urls import resolve

from apps.common.status import RecordStatus
from apps.security.models import Resource, ResourceRole, Role, RoleUser, User

# (método, path de muestra). Lo que se guarda en resources.route NO es el
# path: es resolve(path).route, la misma cadena que verá HasResourceAccess.
# No incluye login, refresh, logout ni perfil: esos accesos no son RBAC.
SAMPLES = [
    # Negocio: clientes
    ("GET", "/api/customers/"),
    ("POST", "/api/customers/"),
    ("GET", "/api/customers/1/"),
    ("PUT", "/api/customers/1/"),
    ("PATCH", "/api/customers/1/"),
    ("DELETE", "/api/customers/1/"),
    # Catálogo: productos
    ("GET", "/api/products/"),
    ("POST", "/api/products/"),
    ("GET", "/api/products/1/"),
    ("PUT", "/api/products/1/"),
    ("PATCH", "/api/products/1/"),
    ("DELETE", "/api/products/1/"),
    # Unidades serializadas
    ("GET", "/api/serialized-units/"),
    ("POST", "/api/serialized-units/"),
    ("GET", "/api/serialized-units/1/"),
    ("PUT", "/api/serialized-units/1/"),
    ("PATCH", "/api/serialized-units/1/"),
    ("DELETE", "/api/serialized-units/1/"),
    # Unidades de un producto
    ("GET", "/api/products/1/units/"),
    # Ventas: colección GET y POST; detalle GET y DELETE (sin PUT ni PATCH)
    ("GET", "/api/sales/"),
    ("POST", "/api/sales/"),
    ("GET", "/api/sales/1/"),
    ("DELETE", "/api/sales/1/"),
]

MATRIX_ENTITIES = ("users", "roles", "role-users", "resources", "resource-roles")
COLLECTION_METHODS = ("GET", "POST")
DETAIL_METHODS = ("GET", "PUT", "PATCH", "DELETE")

ROLE_NAME = "admin"


class Command(BaseCommand):
    help = "Sincroniza la matriz RBAC desde las rutas reales y concede todo al rol admin."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            help="Usuario que recibirá el rol admin (tiene que existir y estar active).",
        )

    def handle(self, *args, **options):
        role, _created = Role.objects.update_or_create(
            name=ROLE_NAME,
            defaults={
                "description": "Administrador de la matriz y del negocio",
                "status": RecordStatus.ACTIVE,
            },
        )

        samples = list(SAMPLES)
        for entity in MATRIX_ENTITIES:
            collection = f"/api/{entity}/"
            detail = f"{collection}1/"
            samples += [(method, collection) for method in COLLECTION_METHODS]
            samples += [(method, detail) for method in DETAIL_METHODS]

        for method, path in samples:
            route = resolve(path).route
            resource, _ = Resource.objects.get_or_create(
                method=method,
                route=route,
                defaults={"name": f"{method} {route}", "status": RecordStatus.ACTIVE},
            )
            if resource.status != RecordStatus.ACTIVE:
                resource.status = RecordStatus.ACTIVE
                resource.save(update_fields=["status", "updated_at"])

            grant, created = ResourceRole.objects.get_or_create(
                resource=resource,
                role=role,
                defaults={"status": RecordStatus.ACTIVE},
            )
            if not created and grant.status != RecordStatus.ACTIVE:
                grant.status = RecordStatus.ACTIVE
                grant.save(update_fields=["status", "updated_at"])

        username = options.get("username")
        if username:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                raise CommandError(
                    f"El usuario {username} no existe. Créelo antes con createsuperuser."
                )
            if user.status != RecordStatus.ACTIVE:
                raise CommandError(
                    f"El usuario {username} no está active; actívelo antes de sembrar."
                )
            link, created = RoleUser.objects.get_or_create(
                role=role,
                user=user,
                defaults={"status": RecordStatus.ACTIVE},
            )
            if not created and link.status != RecordStatus.ACTIVE:
                link.status = RecordStatus.ACTIVE
                link.save(update_fields=["status", "updated_at"])
            self.stdout.write(self.style.SUCCESS(f"Rol admin asignado a {username}."))

        total = ResourceRole.objects.filter(role=role, status=RecordStatus.ACTIVE).count()
        self.stdout.write(self.style.SUCCESS(f"Recursos RBAC sincronizados. ({total} concesiones)"))
