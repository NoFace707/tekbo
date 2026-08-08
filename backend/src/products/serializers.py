"""
Serializers del catálogo de productos.

Interface Segregation:
    - ProductReadSerializer  → solo lectura (list/retrieve).
    - ProductWriteSerializer → create/update (acepta los 4 campos del usuario).
    - ProductSerializer      → alias de lectura usado por defecto en el viewset.

Open/Closed:
    - Añadir campos de sólo lectura en el futuro no rompe el write serializer.
"""
from decimal import Decimal

from rest_framework import serializers

from .models import Product


class ProductReadSerializer(serializers.ModelSerializer):
    """Serializer de lectura: incluye timestamps."""

    class Meta:
        model = Product
        fields = [
            "id",
            "nombre",
            "detalle",
            "stock",
            "costo",
            "costo_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    costo_display = serializers.SerializerMethodField()

    def get_costo_display(self, obj):
        # Formato es-BO con 2 decimales + " Bs" — útil para el frontend.
        return f"{obj.costo:.2f} Bs"


class ProductWriteSerializer(serializers.ModelSerializer):
    """Serializer de escritura: solo los campos editables por el admin."""

    class Meta:
        model = Product
        fields = ["nombre", "detalle", "stock", "costo"]

    def validate_nombre(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("El nombre es obligatorio.")
        return value

    def validate_stock(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError("El stock no puede ser negativo.")
        return value

    def validate_costo(self, value):
        if value is None or value < Decimal("0"):
            raise serializers.ValidationError("El costo no puede ser negativo.")
        return value
