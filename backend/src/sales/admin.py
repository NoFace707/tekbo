from django.contrib import admin

from .models import CashEntry, Document, DocumentItem, StockReservation


class DocumentItemInline(admin.TabularInline):
    model = DocumentItem
    extra = 0
    readonly_fields = ("total",)


class StockReservationInline(admin.TabularInline):
    model = StockReservation
    extra = 0
    readonly_fields = ("created_at", "released_at")


class CashEntryInline(admin.TabularInline):
    model = CashEntry
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "state",
        "vendedor",
        "cliente",
        "fecha",
        "total",
        "created_at",
    )
    list_filter = ("state", "kind")
    search_fields = ("code", "cliente", "celular")
    inlines = [DocumentItemInline, StockReservationInline, CashEntryInline]
    readonly_fields = ("created_at", "updated_at")

    def total(self, obj):
        return sum(item.total for item in obj.items.all())


@admin.register(CashEntry)
@admin.register(StockReservation)
class MiscAdmin(admin.ModelAdmin):
    pass
