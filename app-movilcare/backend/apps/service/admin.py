from django.contrib import admin

from apps.service.models import Diagnosis, PartConsumption, ServiceOrder


class DiagnosisInline(admin.TabularInline):
    model = Diagnosis
    extra = 0
    can_delete = False
    show_change_link = True
    fields = ("description", "diagnosis_date", "observations", "status")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


class PartConsumptionInline(admin.TabularInline):
    model = PartConsumption
    extra = 0
    can_delete = False
    show_change_link = True
    fields = ("part", "quantity", "unit_price", "subtotal", "status")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ServiceOrder)
class ServiceOrderAdmin(admin.ModelAdmin):
    list_display = (
        "number",
        "customer",
        "serialized_unit",
        "open_date",
        "close_date",
        "total",
        "status",
    )
    list_filter = ("status", "open_date", "close_date")
    search_fields = (
        "number",
        "customer__name",
        "serialized_unit__serial",
    )
    ordering = ("-open_date", "id")
    date_hierarchy = "open_date"
    autocomplete_fields = ("customer", "serialized_unit")
    readonly_fields = (
        "number",
        "total",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (
            "Orden",
            {
                "fields": (
                    "number",
                    "customer",
                    "serialized_unit",
                    "open_date",
                    "close_date",
                )
            },
        ),
        ("Totales", {"fields": ("total",), "classes": ("collapse",)}),
        ("Estado", {"fields": ("status",)}),
        (
            "Auditoría",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )
    inlines = (DiagnosisInline, PartConsumptionInline)

    def has_delete_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "customer", "serialized_unit"
        )


@admin.register(Diagnosis)
class DiagnosisAdmin(admin.ModelAdmin):
    list_display = (
        "service_order",
        "description",
        "diagnosis_date",
        "status",
    )
    list_filter = ("status", "diagnosis_date")
    search_fields = ("service_order__number", "description", "observations")
    ordering = ("-diagnosis_date", "id")
    autocomplete_fields = ("service_order",)
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (
            "Diagnóstico",
            {
                "fields": (
                    "service_order",
                    "description",
                    "diagnosis_date",
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

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("service_order")


@admin.register(PartConsumption)
class PartConsumptionAdmin(admin.ModelAdmin):
    list_display = (
        "service_order",
        "part",
        "quantity",
        "unit_price",
        "subtotal",
        "status",
    )
    list_filter = ("status", "part")
    search_fields = ("service_order__number", "part__name")
    ordering = ("id",)
    autocomplete_fields = ("service_order", "part")
    readonly_fields = ("subtotal", "created_at", "updated_at")
    fieldsets = (
        (
            "Consumo",
            {
                "fields": (
                    "service_order",
                    "part",
                    "quantity",
                    "unit_price",
                    "subtotal",
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
            "service_order", "part"
        )
