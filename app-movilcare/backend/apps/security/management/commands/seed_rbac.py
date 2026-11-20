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
    # Garantías: PATCH /warranties/:id es el recurso de referencia de modelo.md
    ("GET", "/api/warranties/"),
    ("POST", "/api/warranties/"),
    ("GET", "/api/warranties/1/"),
    ("PUT", "/api/warranties/1/"),
    ("PATCH", "/api/warranties/1/"),
    ("DELETE", "/api/warranties/1/"),
    # Repuestos de bodega
    ("GET", "/api/parts/"),
    ("POST", "/api/parts/"),
    ("GET", "/api/parts/1/"),
    ("PUT", "/api/parts/1/"),
    ("PATCH", "/api/parts/1/"),
    ("DELETE", "/api/parts/1/"),
    # Órdenes de servicio
    ("GET", "/api/service-orders/"),
    ("POST", "/api/service-orders/"),
    ("GET", "/api/service-orders/1/"),
    ("PUT", "/api/service-orders/1/"),
    ("PATCH", "/api/service-orders/1/"),
    ("DELETE", "/api/service-orders/1/"),
    # Diagnósticos técnicos
    ("GET", "/api/diagnostics/"),
    ("POST", "/api/diagnostics/"),
    ("GET", "/api/diagnostics/1/"),
    ("PUT", "/api/diagnostics/1/"),
    ("PATCH", "/api/diagnostics/1/"),
    ("DELETE", "/api/diagnostics/1/"),
    # Consumos de repuesto
    ("GET", "/api/part-consumptions/"),
    ("POST", "/api/part-consumptions/"),
    ("GET", "/api/part-consumptions/1/"),
    ("PUT", "/api/part-consumptions/1/"),
    ("PATCH", "/api/part-consumptions/1/"),
    ("DELETE", "/api/part-consumptions/1/"),
    # Pagos (venta u orden)
    ("GET", "/api/payments/"),
    ("POST", "/api/payments/"),
    ("GET", "/api/payments/1/"),
    ("PUT", "/api/payments/1/"),
    ("PATCH", "/api/payments/1/"),
    ("DELETE", "/api/payments/1/"),
    # Administración: matriz efectiva de un usuario (acción del UserViewSet)
    ("GET", "/api/users/1/permissions/"),
]

MATRIX_ENTITIES = ("users", "roles", "role-users", "resources", "resource-roles")
COLLECTION_METHODS = ("GET", "POST")
DETAIL_METHODS = ("GET", "PUT", "PATCH", "DELETE")

# Roles iniciales de modelo.md. ADMIN recibe la matriz completa; el resto
# recibe los recursos de su área (ROLE_GRANTS).
ROLE_NAME = "ADMIN"

LEGACY_RENAMES = {
    "admin": "ADMIN",
    "vendedor": "VENTAS",
}

ROLE_DESCRIPTIONS = {
    "ADMIN": "Administrador de la matriz y del negocio",
    "VENTAS": "Ventas, clientes y garantías comerciales",
    "RECEPCION_TECNICA": "Recepción de equipos, órdenes y diagnóstico inicial",
    "TECNICO": "Diagnóstico, reparación y consumo de repuestos",
    "BODEGA": "Catálogo, unidades serializadas y repuestos",
}

ROLE_GRANTS = {
    "VENTAS": [
        # Clientes y consulta de catálogo
        ("GET", "/api/customers/"),
        ("POST", "/api/customers/"),
        ("GET", "/api/customers/1/"),
        ("PUT", "/api/customers/1/"),
        ("PATCH", "/api/customers/1/"),
        ("DELETE", "/api/customers/1/"),
        ("GET", "/api/products/"),
        ("GET", "/api/products/1/"),
        ("GET", "/api/serialized-units/"),
        ("GET", "/api/serialized-units/1/"),
        # Ventas y garantías (PATCH /warranties/:id: modelo.md)
        ("GET", "/api/sales/"),
        ("POST", "/api/sales/"),
        ("GET", "/api/sales/1/"),
        ("DELETE", "/api/sales/1/"),
        ("GET", "/api/warranties/"),
        ("GET", "/api/warranties/1/"),
        ("PATCH", "/api/warranties/1/"),
        # Pagos de las ventas
        ("GET", "/api/payments/"),
        ("POST", "/api/payments/"),
    ],
    "RECEPCION_TECNICA": [
        # Clientes que llegan a recepción
        ("GET", "/api/customers/"),
        ("POST", "/api/customers/"),
        ("GET", "/api/customers/1/"),
        ("PATCH", "/api/customers/1/"),
        # Equipo que se recibe
        ("GET", "/api/products/"),
        ("GET", "/api/products/1/"),
        ("GET", "/api/serialized-units/"),
        ("GET", "/api/serialized-units/1/"),
        # Órdenes de servicio (POST /service-orders: modelo.md)
        ("GET", "/api/service-orders/"),
        ("POST", "/api/service-orders/"),
        ("GET", "/api/service-orders/1/"),
        ("PATCH", "/api/service-orders/1/"),
        # Diagnóstico inicial y garantías
        ("GET", "/api/diagnostics/"),
        ("POST", "/api/diagnostics/"),
        ("GET", "/api/warranties/"),
        ("POST", "/api/warranties/"),
        ("GET", "/api/warranties/1/"),
        ("PATCH", "/api/warranties/1/"),
        # Pagos de las órdenes
        ("GET", "/api/payments/"),
        ("POST", "/api/payments/"),
    ],
    "TECNICO": [
        # Órdenes en curso (POST /diagnostics: modelo.md)
        ("GET", "/api/service-orders/"),
        ("GET", "/api/service-orders/1/"),
        ("PATCH", "/api/service-orders/1/"),
        ("GET", "/api/diagnostics/"),
        ("POST", "/api/diagnostics/"),
        ("GET", "/api/diagnostics/1/"),
        ("PUT", "/api/diagnostics/1/"),
        ("PATCH", "/api/diagnostics/1/"),
        ("DELETE", "/api/diagnostics/1/"),
        # Repuestos consumidos en la reparación
        ("GET", "/api/parts/"),
        ("GET", "/api/parts/1/"),
        ("GET", "/api/part-consumptions/"),
        ("POST", "/api/part-consumptions/"),
        ("GET", "/api/part-consumptions/1/"),
        ("PATCH", "/api/part-consumptions/1/"),
        ("DELETE", "/api/part-consumptions/1/"),
        # Serial del equipo que se repara
        ("GET", "/api/serialized-units/"),
        ("GET", "/api/serialized-units/1/"),
    ],
    "BODEGA": [
        # Repuestos (CRUD completo)
        ("GET", "/api/parts/"),
        ("POST", "/api/parts/"),
        ("GET", "/api/parts/1/"),
        ("PUT", "/api/parts/1/"),
        ("PATCH", "/api/parts/1/"),
        ("DELETE", "/api/parts/1/"),
        # Catálogo y unidades serializadas (CRUD completo)
        ("GET", "/api/products/"),
        ("POST", "/api/products/"),
        ("GET", "/api/products/1/"),
        ("PUT", "/api/products/1/"),
        ("PATCH", "/api/products/1/"),
        ("DELETE", "/api/products/1/"),
        ("GET", "/api/serialized-units/"),
        ("POST", "/api/serialized-units/"),
        ("GET", "/api/serialized-units/1/"),
        ("PUT", "/api/serialized-units/1/"),
        ("PATCH", "/api/serialized-units/1/"),
        ("DELETE", "/api/serialized-units/1/"),
        ("GET", "/api/products/1/units/"),
        # Consulta de consumos (qué repuestos se están usando)
        ("GET", "/api/part-consumptions/"),
        ("GET", "/api/part-consumptions/1/"),
    ],
}


class Command(BaseCommand):
    help = (
        "Sincroniza la matriz RBAC desde las rutas reales, crea los roles "
        "iniciales de modelo.md y concede la matriz completa a ADMIN."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            help="Usuario que recibirá el rol ADMIN (tiene que existir y estar active).",
        )

    def _rename_legacy_roles(self):
        """Los roles heredados pasan a llamarse como en modelo.md.

        Se compara en Python: la collation de MySQL (utf8mb4_unicode_ci)
        hace que filter(name="ADMIN") también cashe con "admin".
        """
        roles = list(Role.objects.all())
        names = {role.name for role in roles}
        for old_name, new_name in LEGACY_RENAMES.items():
            if old_name not in names or new_name in names:
                continue
            target = next(role for role in roles if role.name == old_name)
            Role.objects.filter(pk=target.pk).update(name=new_name)
            self.stdout.write(f"Rol renombrado: {old_name} -> {new_name}.")

    def _ensure_resource_grant(self, role, method, path):
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

    def handle(self, *args, **options):
        self._rename_legacy_roles()

        role, _created = Role.objects.update_or_create(
            name=ROLE_NAME,
            defaults={
                "description": ROLE_DESCRIPTIONS[ROLE_NAME],
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
            self._ensure_resource_grant(role, method, path)

        # Roles de área de modelo.md con sus concesiones.
        for role_name, grants in ROLE_GRANTS.items():
            area_role, _created = Role.objects.update_or_create(
                name=role_name,
                defaults={
                    "description": ROLE_DESCRIPTIONS[role_name],
                    "status": RecordStatus.ACTIVE,
                },
            )
            for method, path in grants:
                self._ensure_resource_grant(area_role, method, path)

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
            self.stdout.write(self.style.SUCCESS(f"Rol {ROLE_NAME} asignado a {username}."))

        total = ResourceRole.objects.filter(role=role, status=RecordStatus.ACTIVE).count()
        self.stdout.write(self.style.SUCCESS(f"Recursos RBAC sincronizados. ({total} concesiones)"))
