from django.contrib import admin

from apps.customer.models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "document_type",
        "document_number",
        "email",
        "phone",
        "status",
        "created_at",
    )
    list_filter = ("status", "document_type")
    search_fields = ("name", "email", "document_number")
    list_editable = ("status",)
    ordering = ("name", "email")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            "Información del cliente",
            {"fields": ("document_type", "document_number", "name", "email", "phone")},
        ),
        ("Estado", {"fields": ("status",)}),
        (
            "Auditoría",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )
