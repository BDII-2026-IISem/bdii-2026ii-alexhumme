from django.contrib import admin

from apps.payment.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "reference_type",
        "reference_id",
        "method",
        "amount",
        "payment_date",
        "status",
    )
    list_filter = ("status", "reference_type", "method", "payment_date")
    search_fields = ("reference_id",)
    ordering = ("-payment_date", "id")
    date_hierarchy = "payment_date"
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            "Pago",
            {
                "fields": (
                    "reference_type",
                    "reference_id",
                    "method",
                    "amount",
                    "payment_date",
                )
            },
        ),
        ("Estado", {"fields": ("status",)}),
        (
            "Auditoría",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def has_delete_permission(self, request, obj=None):
        return False
