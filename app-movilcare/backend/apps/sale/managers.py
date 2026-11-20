from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction

from apps.common.status import RecordStatus
from apps.customer.models import Customer
from apps.product.models import SerializedUnit


class SaleQuerySet(models.QuerySet):

    def register(self, *, customer, sale_date, unit_ids):
        # Import diferido: models.py importa este módulo, así que no se puede
        # importar SaleDetail a nivel de módulo sin crear un import circular.
        from apps.sale.models import SaleDetail

        if not unit_ids:
            raise ValidationError({
                "items": ["La venta requiere al menos una unidad serializada."]
            })

        unit_ids = [int(unit_id) for unit_id in unit_ids]

        if len(set(unit_ids)) != len(unit_ids):
            raise ValidationError({
                "items": ["Una unidad serializada no puede repetirse en la venta."]
            })

        with transaction.atomic():
            locked_customer = (
                Customer.objects
                .select_for_update()
                .filter(pk=customer.pk)
                .first()
            )

            if locked_customer is None:
                raise ValidationError({
                    "customer_id": ["El cliente no existe."]
                })

            if locked_customer.status != RecordStatus.ACTIVE:
                raise ValidationError({
                    "customer_id": ["El cliente debe estar activo."]
                })

            # select_for_update + select_related: bloquea las unidades y sus
            # productos para que dos ventas simultáneas no compren el mismo
            # serial en el mismo instante.
            locked_units = {
                unit.id: unit
                for unit in (
                    SerializedUnit.objects
                    .select_for_update()
                    .select_related("product")
                    .filter(pk__in=unit_ids)
                    .order_by("id")
                )
            }

            if len(locked_units) != len(set(unit_ids)):
                raise ValidationError({
                    "items": ["Hay unidades serializadas que no existen."]
                })

            for unit in locked_units.values():
                if unit.status != RecordStatus.ACTIVE:
                    raise ValidationError({
                        "items": [
                            f"La unidad {unit.serial} no está activa."
                        ]
                    })
                if unit.product.status != RecordStatus.ACTIVE:
                    raise ValidationError({
                        "items": [
                            f"El producto {unit.product.name} no está activo."
                        ]
                    })

            sale = self.model(
                customer=locked_customer,
                sale_date=sale_date,
                subtotal=Decimal("0.00"),
                tax=Decimal("0.00"),
                total=Decimal("0.00"),
                status=RecordStatus.INACTIVE,
            )
            sale.save()

            subtotal = Decimal("0.00")

            for unit_id in unit_ids:
                unit = locked_units[unit_id]

                # Cada línea lleva una unidad (cantidad 1) al precio vivo del
                # catálogo al momento de vender: el detalle congela el precio.
                unit_price = Decimal(str(unit.product.price))
                line_total = unit_price.quantize(Decimal("0.01"))

                SaleDetail.objects.create(
                    sale=sale,
                    serialized_unit=unit,
                    quantity=1,
                    unit_price=unit_price,
                    line_total=line_total,
                    status=RecordStatus.ACTIVE,
                )

                subtotal += line_total

            subtotal = subtotal.quantize(Decimal("0.01"))

            # Conservamos el campo tax de Sale.
            # Se inicializa en cero porque no se ha definido
            # una regla de cálculo de impuestos en este método.
            tax = Decimal("0.00")

            total = (subtotal + tax).quantize(Decimal("0.01"))

            sale.subtotal = subtotal
            sale.tax = tax
            sale.total = total
            sale.status = RecordStatus.ACTIVE

            sale.save(
                update_fields=[
                    "subtotal",
                    "tax",
                    "total",
                    "status",
                    "updated_at",
                ]
            )

            return sale

class SaleManager(models.Manager.from_queryset(SaleQuerySet)):
    pass
