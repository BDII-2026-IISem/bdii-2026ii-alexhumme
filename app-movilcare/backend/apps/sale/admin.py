from django.contrib import admin

from apps.sale.models import Sale, SaleDetail, Warranty


class SaleDetailInline(admin.TabularInline):
    model = SaleDetail
    extra = 0
    can_delete = False
    show_change_link = True
    fields = ("serialized_unit", "quantity", "unit_price", "line_total", "status")
    readonly_fields = (
        "serialized_unit",
        "quantity",
        "unit_price",
        "line_total",
        "status",
    )

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer",
        "sale_date",
        "subtotal",
        "tax",
        "total",
        "status",
    )
    list_filter = ("status", "sale_date")
    search_fields = ("customer__name", "customer__email")
    ordering = ("-sale_date",)
    date_hierarchy = "sale_date"
    readonly_fields = (
        "customer",
        "sale_date",
        "subtotal",
        "tax",
        "total",
        "status",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        ("Información de la venta", {"fields": ("customer", "status")}),
        (
            "Totales",
            {
                "fields": ("subtotal", "tax", "total"),
                "classes": ("collapse",),
            },
        ),
        ("Fecha", {"fields": ("sale_date",), "classes": ("collapse",)}),
        (
            "Auditoría",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )
    inlines = (SaleDetailInline,)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("customer")


@admin.register(SaleDetail)
class SaleDetailAdmin(admin.ModelAdmin):
    list_display = (
        "sale",
        "serialized_unit",
        "quantity",
        "unit_price",
        "line_total",
        "status",
    )
    list_filter = ("status", "sale__sale_date", "serialized_unit__status")
    search_fields = (
        "sale__customer__name",
        "serialized_unit__serial",
        "serialized_unit__product__name",
    )
    ordering = ("-sale__sale_date", "id")
    readonly_fields = (
        "sale",
        "serialized_unit",
        "quantity",
        "unit_price",
        "line_total",
        "observations",
        "status",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (
            "Línea",
            {
                "fields": (
                    "sale",
                    "serialized_unit",
                    "quantity",
                    "unit_price",
                    "line_total",
                    "observations",
                )
            },
        ),
        ("Estado", {"fields": ("status",)}),
        (
            "Auditoría",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "sale", "sale__customer", "serialized_unit", "serialized_unit__product"
        )


@admin.register(Warranty)
class WarrantyAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "sale_detail",
        "warranty_type",
        "start_date",
        "end_date",
        "status",
    )
    list_filter = ("status", "warranty_type", "start_date")
    search_fields = (
        "sale_detail__sale__customer__name",
        "sale_detail__serialized_unit__serial",
    )
    ordering = ("-start_date", "id")
    autocomplete_fields = ("sale_detail",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            "Garantía",
            {
                "fields": (
                    "sale_detail",
                    "warranty_type",
                    "start_date",
                    "end_date",
                    "description",
                )
            },
        ),
        ("Estado", {"fields": ("status",)}),
        (
            "Auditoría",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "sale_detail__serialized_unit", "sale_detail__sale"
        )
