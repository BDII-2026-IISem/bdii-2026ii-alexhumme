from decimal import Decimal

from django.core.validators import MinLengthValidator, MinValueValidator
from django.db import models

from apps.common.models import StoreLabModel

class Product(StoreLabModel):
    sku = models.CharField(max_length=100, unique=True, validators=[MinLengthValidator(2)], default="0000000")
    name = models.CharField(max_length=150, unique=True, validators=[MinLengthValidator(1)])
    description = models.CharField(max_length=255, null=True, blank=True)
    price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )

    class Meta:
        db_table = "products"
        verbose_name = "producto"
        verbose_name_plural = "productos"
        ordering = ["name", "id"]
        constraints = [
            StoreLabModel.status_constraint("products_status_valid"),
            models.CheckConstraint(
                condition=models.Q(price__gte=0),
                name="product_price_non_neg",
            ),
        ]

    def __str__(self):
        return self.name


class SerializedUnit(StoreLabModel):
    product = models.ForeignKey(
        Product,
        on_delete=models.RESTRICT,
        related_name="serialized_units",
        db_column="product_id",
    )
    name = models.CharField(max_length=150, unique=True, validators=[MinLengthValidator(2)])
    description = models.CharField(max_length=255, null=True, blank=True)

    class Meta: 
        db_table = "serialized_units"
        verbose_name = "Unidad serializada"
        verbose_name_plural = "Unidades serializadas"
        ordering = ["name", "id"]
        constraints = [StoreLabModel.status_constraint("serialized_units_status_valid")]

    def __str__(self):
        return self.name