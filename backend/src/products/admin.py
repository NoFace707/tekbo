from django.contrib import admin

from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("nombre", "stock", "costo", "updated_at")
    list_filter = ("created_at",)
    search_fields = ("nombre", "detalle")
    list_editable = ("stock", "costo")
    ordering = ("nombre",)
