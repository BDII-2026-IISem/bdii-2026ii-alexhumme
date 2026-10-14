from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction

from apps.common.status import RecordStatus
from apps.customer.models import Customer
from apps.product.models import Product


class SaleQuerySet(models.QuerySet):

    def register(self, *, customer, sale_date, items, discounts):
        # Import diferido: models.py importa este módulo, así que no se puede
        # importar SaleDetail a nivel de módulo sin crear un import circular.
        from apps.sale.models import SaleDetail

        if not items:
            raise ValidationError({
                "items": ["La venta requiere al menos un producto."]
            })

        discounts = Decimal(str(discounts)).quantize(Decimal("0.01"))

        if discounts < 0:
            raise ValidationError({
                "discounts": ["El descuento no puede ser negativo."]
            })

        quantities = {}

        for item in items:
            try:
                product_id = int(item["product_id"])
                quantity = int(item["quantity"])
            except (KeyError, TypeError, ValueError):
                raise ValidationError({
                    "items": [
                        "Cada producto debe tener product_id y quantity válidos."
                    ]
                })

            if quantity < 1:
                raise ValidationError({
                    "items": ["La cantidad debe ser al menos 1."]
                })

            quantities[product_id] = (
                quantities.get(product_id, 0) + quantity
            )

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

            locked_products = {
                product.id: product
                for product in (
                    Product.objects
                    .select_for_update()
                    .filter(pk__in=quantities)
                    .order_by("id")
                )
            }

            if len(locked_products) != len(quantities):
                raise ValidationError({
                    "items": ["Hay productos que no existen."]
                })

            for product in locked_products.values():
                if product.status != RecordStatus.ACTIVE:
                    raise ValidationError({
                        "items": [
                            f"El producto {product.name} no está activo."
                        ]
                    })

            sale = self.model(
                customer=locked_customer,
                sale_date=sale_date,
                subtotal=Decimal("0.00"),
                tax=Decimal("0.00"),
                discounts=discounts,
                total=Decimal("0.00"),
                status=RecordStatus.INACTIVE,
            )
            sale.save()

            subtotal = Decimal("0.00")

            for item in items:
                product = locked_products[int(item["product_id"])]
                quantity = int(item["quantity"])

                unit_price = Decimal(str(product.price))
                line_total = (
                    unit_price * quantity
                ).quantize(Decimal("0.01"))

                SaleDetail.objects.create(
                    sale=sale,
                    product=product,
                    quantity=quantity,
                    unit_price=unit_price,
                    line_total=line_total,
                    status=RecordStatus.ACTIVE,
                )

                subtotal += line_total

            subtotal = subtotal.quantize(Decimal("0.01"))

            if discounts > subtotal:
                raise ValidationError({
                    "discounts": [
                        "El descuento no puede superar el subtotal."
                    ]
                })

            # Conservamos el campo tax de Sale.
            # Se inicializa en cero porque no se ha definido
            # una regla de cálculo de impuestos en este método.
            tax = Decimal("0.00")

            total = (subtotal + tax - discounts).quantize(Decimal("0.01"))

            sale.subtotal = subtotal
            sale.tax = tax
            sale.discounts = discounts
            sale.total = total
            sale.status = RecordStatus.ACTIVE

            sale.save(
                update_fields=[
                    "subtotal",
                    "tax",
                    "discounts",
                    "total",
                    "status",
                    "updated_at",
                ]
            )

            return sale

class SaleManager(models.Manager.from_queryset(SaleQuerySet)):
    pass