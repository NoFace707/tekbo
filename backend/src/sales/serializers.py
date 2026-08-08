"""
Serializers del módulo de ventas.

Interface Segregation (ISP): tres serializers separados según el caso de uso:

    - DocumentItemReadSerializer  : lectura de ítems.
    - DocumentReadSerializer      : lectura del documento completo (incluye
                                    ítems, totales, reservas y caja).
    - DocumentWriteSerializer     : creación/edición del documento + ítems.

Open/Closed (OCP): añadir campos de lectura no rompe el write serializer.
"""

from decimal import Decimal

from rest_framework import serializers

from products.models import Product
from .models import CashEntry, Document, DocumentItem, StockReservation


class DocumentItemReadSerializer(serializers.ModelSerializer):
    total = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )

    class Meta:
        model = DocumentItem
        fields = ["id", "product", "desc", "qty", "price", "total"]
        read_only_fields = fields


class CashEntryReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashEntry
        fields = ["id", "kind", "amount", "is_revoked", "note", "created_at"]
        read_only_fields = fields


class StockReservationReadSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.nombre", read_only=True)

    class Meta:
        model = StockReservation
        fields = ["id", "product", "product_name", "qty", "created_at", "released_at"]
        read_only_fields = fields


class DocumentReadSerializer(serializers.ModelSerializer):
    """Serializer de lectura: incluye todo lo necesario para el frontend."""

    items = DocumentItemReadSerializer(many=True, read_only=True)
    cash_entries = CashEntryReadSerializer(many=True, read_only=True)
    reservations = StockReservationReadSerializer(many=True, read_only=True)
    state_display = serializers.CharField(
        source="get_state_display", read_only=True
    )
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    vendedor_name = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    paid_total = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "code",
            "state",
            "state_display",
            "kind",
            "kind_display",
            "vendedor",
            "vendedor_name",
            "cliente",
            "fecha",
            "direccion",
            "celular",
            "descuento",
            "items",
            "reservations",
            "cash_entries",
            "subtotal",
            "total",
            "paid_total",
            "balance_due",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_vendedor_name(self, obj):
        u = obj.vendedor
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username

    def get_subtotal(self, obj):
        return sum(
            (item.total for item in obj.items.all()), Decimal("0")
        )

    def get_total(self, obj):
        return self.get_subtotal(obj) - (obj.descuento or Decimal("0"))

    def get_paid_total(self, obj):
        qs = obj.cash_entries.filter(is_revoked=False)
        return sum((e.amount for e in qs), Decimal("0"))

    def get_balance_due(self, obj):
        return self.get_total(obj) - self.get_paid_total(obj)


class DocumentItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentItem
        fields = ["product", "desc", "qty", "price"]

    def validate_qty(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("La cantidad debe ser > 0.")
        return value

    def validate_price(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError("El precio no puede ser negativo.")
        return value

    def validate(self, attrs):
        # Si llega product, aseguramos desc con el nombre del producto si está vacío.
        product = attrs.get("product")
        desc = (attrs.get("desc") or "").strip()
        if product and not desc:
            attrs["desc"] = product.nombre
        return attrs


class DocumentWriteSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar el documento con sus ítems."""

    items = DocumentItemWriteSerializer(many=True, required=False)

    class Meta:
        model = Document
        fields = [
            "cliente",
            "fecha",
            "direccion",
            "celular",
            "descuento",
            "kind",
            "items",
        ]

    def validate_cliente(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("El cliente es obligatorio.")
        return value

    def validate_fecha(self, value):
        if not value:
            raise serializers.ValidationError("La fecha es obligatoria.")
        return value

    def validate_descuento(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError("El descuento no puede ser negativo.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        vendedor = self.context["request"].user
        # Generar código único determinista.
        code = self._generate_code(vendedor)
        document = Document.objects.create(
            vendedor=vendedor,
            code=code,
            **validated_data,
        )
        self._sync_items(document, items_data)
        return document

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        # Solo se puede editar ítems si está en PROFORMA.
        if items_data is not None and instance.state != Document.State.PROFORMA:
            raise serializers.ValidationError(
                {
                    "items": (
                        "No se pueden modificar los ítems de un documento "
                        f"en estado '{instance.state}'. Revertir a proforma primero."
                    )
                }
            )

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            self._sync_items(instance, items_data)
        return instance

    # --- Helpers ----------------------------------------------------------

    @staticmethod
    def _generate_code(vendedor) -> str:
        import uuid
        return f"DOC-{vendedor.id:04d}-{uuid.uuid4().hex[:8].upper()}"

    @staticmethod
    def _sync_items(document: Document, items_data: list) -> None:
        # Estrategia simple: reemplazo total (los ítems no tienen identidad
        # relevante fuera del documento).
        document.items.all().delete()
        for item_data in items_data:
            DocumentItem.objects.create(document=document, **item_data)
