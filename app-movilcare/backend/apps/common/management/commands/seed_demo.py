from datetime import date, datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.common.status import RecordStatus
from apps.customer.models import Customer
from apps.payment.models import Payment, PaymentMethod, ReferenceType
from apps.product.models import Part, Product, SerializedUnit
from apps.sale.models import Sale, Warranty, WarrantyType
from apps.service.models import Diagnosis, PartConsumption, ServiceOrder

# Etiqueta de salida en el orden del flujo de negocio.
LABELS = [
    "clientes",
    "productos",
    "unidades",
    "repuestos",
    "ventas",
    "líneas",
    "garantías",
    "órdenes",
    "diagnósticos",
    "consumos",
    "pagos",
]


def _aware(year, month, day, hour=12, minute=0):
    """Fecha-hora consciente en la zona de la configuración (America/Bogota)."""
    return datetime(
        year, month, day, hour, minute, tzinfo=timezone.get_current_timezone()
    )


def _first_or_create(model, lookup, defaults):
    """Crea solo si la clave natural no existe: re-ejecutar no duplica."""
    found = model.objects.filter(**lookup).first()
    if found is not None:
        return found, False
    return model.objects.create(**lookup, **defaults), True


# ---------------------------------------------------------------------------
# Catálogo: lo que no cambia entre ejecuciones.
# ---------------------------------------------------------------------------

CUSTOMERS = [
    # (tipo, documento, nombre, correo, teléfono, estado)
    ("CC", "1023456789", "Carmen López", "carmen@example.com", "3012345678", "active"),
    ("CC", "1087654321", "Diego Fernández", "diego@example.com", "3023456789", "active"),
    ("CE", "3098765432", "Valentina Rojas", "valentina@example.com", "3034567890", "active"),
    ("CC", "791234567", "Jorge Castillo", "jorge@example.com", "3045678901", "active"),
    ("CC", "1009876543", "Marcela Ortiz", "marcela@example.com", "3056789012", "active"),
    ("NIT", "9001234567", "Andrés Peña", "andres@example.com", "3067890123", "active"),
]

PRODUCTS = [
    # (sku, nombre, precio, descripción)
    ("DEV-001", "iPhone 13", Decimal("480.00"), "Terminal 128 GB, libre"),
    ("DEV-002", "Samsung Galaxy A15", Decimal("180.00"), "Terminal 128 GB"),
    ("DEV-003", "Xiaomi Redmi Note 13", Decimal("150.00"), "Terminal 256 GB"),
    ("DEV-004", "Tablet Lenovo Tab M10", Decimal("130.00"), "Tablet 10 pulgadas"),
    ("DEV-005", "Smartwatch Xiaomi Band 8", Decimal("35.00"), "Pulsera inteligente"),
]

UNITS = [
    # (sku del producto, serial)
    ("DEV-001", "SN-IP13-001"),
    ("DEV-001", "SN-IP13-002"),
    ("DEV-001", "SN-IP13-003"),
    ("DEV-002", "SN-A15-001"),
    ("DEV-002", "SN-A15-002"),
    ("DEV-003", "SN-RN13-001"),
    ("DEV-003", "SN-RN13-002"),
    ("DEV-004", "SN-TAB10-001"),
    ("DEV-004", "SN-TAB10-002"),
    ("DEV-005", "SN-BAND8-001"),
    ("DEV-005", "SN-BAND8-002"),
]

PARTS = [
    # (nombre, precio, stock, descripción, estado)
    (
        "Pantalla OLED iPhone 13",
        Decimal("95.00"),
        6,
        "Módulo original con digitalizador",
        "active",
    ),
    (
        "Flex de carga iPhone 13",
        Decimal("18.00"),
        14,
        "Flex con micrófono y home",
        "active",
    ),
    (
        "Batería Samsung A15",
        Decimal("40.00"),
        9,
        "Batería de repuesto 5000 mAh",
        "active",
    ),
    (
        "Módulo de cámara Redmi Note 13",
        Decimal("65.00"),
        5,
        "Cámara trasera de repuesto",
        "active",
    ),
    (
        "Cargador genérico sin certificar",
        Decimal("8.00"),
        20,
        "Retirado de venta: sin homologación",
        "inactive",
    ),
]

# ---------------------------------------------------------------------------
# Movimientos: ventas, garantías, órdenes y pagos con claves naturales.
# ---------------------------------------------------------------------------

SALES = [
    # (documento, fecha, seriales)
    ("1023456789", _aware(2026, 9, 5, 10, 15), ["SN-IP13-001"]),
    ("1087654321", _aware(2026, 9, 18, 15, 40), ["SN-A15-001", "SN-BAND8-001"]),
    ("3098765432", _aware(2026, 10, 2, 11, 5), ["SN-RN13-001"]),
    ("791234567", _aware(2026, 10, 10, 9, 30), ["SN-TAB10-001", "SN-BAND8-002"]),
    ("1009876543", _aware(2026, 10, 28, 16, 20), ["SN-IP13-002", "SN-IP13-003"]),
    ("9001234567", _aware(2026, 11, 12, 14, 10), ["SN-A15-002", "SN-RN13-002"]),
]

WARRANTIES = [
    # (documento, fecha de venta, índice de línea, inicio, fin, tipo, estado, texto)
    (
        "1023456789",
        _aware(2026, 9, 5, 10, 15),
        0,
        date(2026, 9, 5),
        date(2027, 9, 5),
        WarrantyType.COMMERCIAL,
        RecordStatus.ACTIVE,
        "Garantía de un año por compra",
    ),
    (
        "1009876543",
        _aware(2026, 10, 28, 16, 20),
        0,
        date(2026, 10, 28),
        date(2028, 10, 28),
        WarrantyType.EXTENDED,
        RecordStatus.ACTIVE,
        "Garantía extendida a dos años",
    ),
    (
        "1009876543",
        _aware(2026, 10, 28, 16, 20),
        1,
        date(2026, 10, 28),
        date(2027, 10, 28),
        WarrantyType.COMMERCIAL,
        RecordStatus.INACTIVE,
        "Anulada por reintegro del artículo",
    ),
    (
        "9001234567",
        _aware(2026, 11, 12, 14, 10),
        0,
        date(2026, 11, 12),
        date(2027, 11, 12),
        WarrantyType.COMMERCIAL,
        RecordStatus.ACTIVE,
        "Garantía de un año por compra",
    ),
]

ORDERS = [
    # (número, documento, serial, apertura, cierre)
    ("OS-261008-0A1B2C", "1023456789", "SN-IP13-001", date(2026, 10, 8), date(2026, 10, 12)),
    ("OS-261020-1B2C3D", "1087654321", "SN-A15-001", date(2026, 10, 20), None),
    ("OS-261104-2C3D4E", "1009876543", "SN-IP13-002", date(2026, 11, 4), date(2026, 11, 9)),
    ("OS-261116-3D4E5F", "9001234567", "SN-RN13-002", date(2026, 11, 16), None),
]

DIAGNOSES = [
    # (número de orden, descripción, fecha, observaciones)
    (
        "OS-261008-0A1B2C",
        "No carga con el cable original",
        date(2026, 10, 8),
        "Se reemplaza el flex de carga",
    ),
    (
        "OS-261020-1B2C3D",
        "Se descarga en menos de dos horas",
        date(2026, 10, 20),
        "Batería al 61% de salud",
    ),
    (
        "OS-261104-2C3D4E",
        "Pantalla parpadea al encender",
        date(2026, 11, 4),
        "Sin golpes en el cristal",
    ),
    (
        "OS-261104-2C3D4E",
        "Se reemplaza módulo y flex",
        date(2026, 11, 6),
        "Prueba de colores OK antes de cerrar",
    ),
    (
        "OS-261116-3D4E5F",
        "Cámara borrosa tras caída",
        date(2026, 11, 16),
        "Lente con astilla interna",
    ),
]

CONSUMPTIONS = [
    # (número de orden, repuesto, cantidad)
    ("OS-261008-0A1B2C", "Flex de carga iPhone 13", 1),
    ("OS-261020-1B2C3D", "Batería Samsung A15", 1),
    ("OS-261104-2C3D4E", "Pantalla OLED iPhone 13", 1),
    ("OS-261104-2C3D4E", "Flex de carga iPhone 13", 1),
    ("OS-261116-3D4E5F", "Módulo de cámara Redmi Note 13", 1),
]

SALE_PAYMENTS = [
    # (documento, fecha de venta, método, monto, fecha de pago)
    ("1023456789", _aware(2026, 9, 5, 10, 15), PaymentMethod.CARD, Decimal("480.00"), date(2026, 9, 5)),
    ("1087654321", _aware(2026, 9, 18, 15, 40), PaymentMethod.CASH, Decimal("215.00"), date(2026, 9, 18)),
    ("3098765432", _aware(2026, 10, 2, 11, 5), PaymentMethod.TRANSFER, Decimal("150.00"), date(2026, 10, 2)),
    ("791234567", _aware(2026, 10, 10, 9, 30), PaymentMethod.MOBILE, Decimal("165.00"), date(2026, 10, 10)),
    # La venta de Marcela se paga en dos abonos: efectivo + tarjeta.
    ("1009876543", _aware(2026, 10, 28, 16, 20), PaymentMethod.CASH, Decimal("240.00"), date(2026, 10, 28)),
    ("1009876543", _aware(2026, 10, 28, 16, 20), PaymentMethod.CARD, Decimal("720.00"), date(2026, 10, 29)),
    ("9001234567", _aware(2026, 11, 12, 14, 10), PaymentMethod.CASH, Decimal("330.00"), date(2026, 11, 12)),
]

ORDER_PAYMENTS = [
    # (número de orden, método, monto, fecha de pago)
    ("OS-261008-0A1B2C", PaymentMethod.TRANSFER, Decimal("18.00"), date(2026, 10, 12)),
    ("OS-261104-2C3D4E", PaymentMethod.CARD, Decimal("113.00"), date(2026, 11, 9)),
]


class Command(BaseCommand):
    help = (
        "Puebla la base con datos de demostración de MovilCare: clientes, "
        "catálogo con unidades, ventas con líneas y garantías, órdenes con "
        "diagnósticos, consumos y pagos. Idempotente por clave natural "
        "(documento, sku, serial, número de orden…): re-ejecutarlo no "
        "duplica filas."
    )

    def handle(self, *args, **options):
        self.created: dict[str, int] = {}

        customers = self._seed_customers()
        products = self._seed_products()
        units = self._seed_units(products)
        parts = self._seed_parts()
        sales = self._seed_sales(customers, units)
        self._seed_warranties(sales)
        orders = self._seed_orders(customers, units)
        self._seed_diagnoses(orders)
        self._seed_consumptions(orders, parts)
        self._seed_payments(sales, orders)

        self._report()

    # -- utilidades ---------------------------------------------------------

    def _track(self, label: str, created: bool) -> None:
        if created:
            self.created[label] = self.created.get(label, 0) + 1

    def _seed_customers(self) -> dict[str, Customer]:
        result: dict[str, Customer] = {}
        for doc_type, document, name, email, phone, status in CUSTOMERS:
            customer, created = _first_or_create(
                Customer,
                {"document_number": document},
                {
                    "document_type": doc_type,
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "status": status,
                },
            )
            self._track("clientes", created)
            result[document] = customer
        return result

    def _seed_products(self) -> dict[str, Product]:
        result: dict[str, Product] = {}
        for sku, name, price, description in PRODUCTS:
            product, created = _first_or_create(
                Product,
                {"sku": sku},
                {
                    "name": name,
                    "price": price,
                    "description": description,
                    "status": RecordStatus.ACTIVE,
                },
            )
            self._track("productos", created)
            result[sku] = product
        return result

    def _seed_units(self, products: dict[str, Product]) -> dict[str, SerializedUnit]:
        result: dict[str, SerializedUnit] = {}
        for sku, serial in UNITS:
            unit, created = _first_or_create(
                SerializedUnit,
                {"serial": serial},
                {
                    "product": products[sku],
                    "status": RecordStatus.ACTIVE,
                },
            )
            self._track("unidades", created)
            result[serial] = unit
        return result

    def _seed_parts(self) -> dict[str, Part]:
        result: dict[str, Part] = {}
        for name, price, stock, description, status in PARTS:
            part, created = _first_or_create(
                Part,
                {"name": name},
                {
                    "price": price,
                    "stock": stock,
                    "description": description,
                    "status": status,
                },
            )
            self._track("repuestos", created)
            result[name] = part
        return result

    def _seed_sales(
        self,
        customers: dict[str, Customer],
        units: dict[str, SerializedUnit],
    ) -> dict[tuple[str, datetime], Sale]:
        result: dict[tuple[str, datetime], Sale] = {}
        for document, sale_date, serials in SALES:
            key = (document, sale_date)
            existing = Sale.objects.filter(
                customer=customers[document], sale_date=sale_date
            ).first()
            if existing is not None:
                result[key] = existing
                continue

            # Alta por el mismo camino que la API: transacción, precios
            # congelados por línea y totales calculados.
            sale = Sale.objects.register(
                customer=customers[document],
                sale_date=sale_date,
                unit_ids=[units[serial].id for serial in serials],
            )
            self._track("ventas", True)
            self.created["líneas"] = self.created.get("líneas", 0) + len(serials)
            result[key] = sale
        return result

    def _seed_warranties(self, sales: dict[tuple[str, datetime], Sale]) -> None:
        for (
            document,
            sale_date,
            line_index,
            start,
            end,
            warranty_type,
            status,
            description,
        ) in WARRANTIES:
            sale = sales[(document, sale_date)]
            lines = list(sale.lines.order_by("id"))
            if line_index >= len(lines):
                continue
            _, created = _first_or_create(
                Warranty,
                {"sale_detail": lines[line_index]},
                {
                    "start_date": start,
                    "end_date": end,
                    "warranty_type": warranty_type,
                    "description": description,
                    "status": status,
                },
            )
            self._track("garantías", created)

    def _seed_orders(
        self,
        customers: dict[str, Customer],
        units: dict[str, SerializedUnit],
    ) -> dict[str, ServiceOrder]:
        result: dict[str, ServiceOrder] = {}
        for number, document, serial, open_date, close_date in ORDERS:
            order, created = _first_or_create(
                ServiceOrder,
                {"number": number},
                {
                    "customer": customers[document],
                    "serialized_unit": units[serial],
                    "open_date": open_date,
                    "close_date": close_date,
                    "status": RecordStatus.ACTIVE,
                },
            )
            self._track("órdenes", created)
            result[number] = order
        return result

    def _seed_diagnoses(self, orders: dict[str, ServiceOrder]) -> None:
        for number, description, diagnosis_date, observations in DIAGNOSES:
            _, created = _first_or_create(
                Diagnosis,
                {"service_order": orders[number], "description": description},
                {
                    "diagnosis_date": diagnosis_date,
                    "observations": observations,
                    "status": RecordStatus.ACTIVE,
                },
            )
            self._track("diagnósticos", created)

    def _seed_consumptions(
        self,
        orders: dict[str, ServiceOrder],
        parts: dict[str, Part],
    ) -> None:
        for number, part_name, quantity in CONSUMPTIONS:
            part = parts[part_name]
            consumption, created = _first_or_create(
                PartConsumption,
                {"service_order": orders[number], "part": part},
                {
                    "quantity": quantity,
                    # El consumo congela el precio del repuesto al usarlo.
                    "unit_price": part.price,
                    "status": RecordStatus.ACTIVE,
                },
            )
            self._track("consumos", created)
            if created:
                # save() ya recalculó el total; lo dejamos constancia igual.
                orders[number].refresh_from_db(fields=["total"])

    def _seed_payments(
        self,
        sales: dict[tuple[str, datetime], Sale],
        orders: dict[str, ServiceOrder],
    ) -> None:
        for document, sale_date, method, amount, payment_date in SALE_PAYMENTS:
            sale = sales[(document, sale_date)]
            _, created = _first_or_create(
                Payment,
                {
                    "reference_type": ReferenceType.SALE,
                    "reference_id": sale.id,
                    "method": method,
                    "payment_date": payment_date,
                },
                {"amount": amount, "status": RecordStatus.ACTIVE},
            )
            self._track("pagos", created)

        for number, method, amount, payment_date in ORDER_PAYMENTS:
            order = orders[number]
            _, created = _first_or_create(
                Payment,
                {
                    "reference_type": ReferenceType.SERVICE_ORDER,
                    "reference_id": order.id,
                    "method": method,
                    "payment_date": payment_date,
                },
                {"amount": amount, "status": RecordStatus.ACTIVE},
            )
            self._track("pagos", created)

    def _report(self) -> None:
        totals = {
            "clientes": Customer.objects.count(),
            "productos": Product.objects.count(),
            "unidades": SerializedUnit.objects.count(),
            "repuestos": Part.objects.count(),
            "ventas": Sale.objects.count(),
            "líneas": sum(sale.lines.count() for sale in Sale.objects.all()),
            "garantías": Warranty.objects.count(),
            "órdenes": ServiceOrder.objects.count(),
            "diagnósticos": Diagnosis.objects.count(),
            "consumos": PartConsumption.objects.count(),
            "pagos": Payment.objects.count(),
        }

        self.stdout.write("Datos de demostración (re-ejecutable):")
        for label in LABELS:
            added = self.created.get(label, 0)
            self.stdout.write(f"  {label:12} +{added:<3} ({totals[label]})")

        self.stdout.write(self.style.SUCCESS("Base poblada."))
