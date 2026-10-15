from django.contrib import admin

from apps.product.models import Product, SerializedUnit


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "price", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("sku", "name", "description")
    list_editable = ("price", "status")
    ordering = ("name",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Información", {"fields": ("sku", "name", "description")}),
        ("Precio", {"fields": ("price",)}),
        ("Estado", {"fields": ("status",)}),
        (
            "Auditoría",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(SerializedUnit)
class SerializedUnitAdmin(admin.ModelAdmin):
    list_display = ("name", "product", "status", "created_at")
    list_filter = ("status", "product")
    search_fields = ("name", "description", "product__name", "product__sku")
    list_editable = ("status",)
    ordering = ("name",)
    autocomplete_fields = ("product",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Información", {"fields": ("product", "name", "description")}),
        ("Estado", {"fields": ("status",)}),
        (
            "Auditoría",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("product")
