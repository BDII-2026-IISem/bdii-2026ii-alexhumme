from django.core.validators import MinLengthValidator
from django.db import models

from apps.common.models import StoreLabModel


class Customer(StoreLabModel):
    document_type = models.CharField(max_length=30, null=False, blank=True)
    document_number = models.CharField(max_length=11, null=False, blank=True)
    name = models.CharField(max_length=150, validators=[MinLengthValidator(2)])
    email = models.EmailField(max_length=150, null=True, blank=True, unique=True)
    phone = models.CharField(max_length=30, null=True, blank=True)

    class Meta:
        db_table = "customers"
        verbose_name = "cliente"
        verbose_name_plural = "clientes"
        ordering = ["name", "id"]
        constraints = [StoreLabModel.status_constraint("customers_status_valid")]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        super().save(*args, **kwargs)
