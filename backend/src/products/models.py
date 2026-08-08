"""
Modelo Product.

Single Responsibility: representa un producto del catálogo Tekbo.
Solo sabe guardar/recuperar sus propios datos; no implementa reglas de
negocio (p. ej. descuento de stock al vender, márgenes, etc.) — eso
vivirá en servicios de dominio separados (Open/Closed).

Fields (según requerimiento del usuario):
    - nombre  (CharField)
    - detalle (TextField, opcional)
    - stock   (IntegerField >= 0)
    - costo   (DecimalField, Bs)
Sin imágenes.
"""

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class Product(models.Model):
    """Producto del catálogo."""

    nombre = models.CharField(
        max_length=200,
        verbose_name="Nombre",
        db_index=True,
    )
    detalle = models.TextField(
        blank=True,
        default="",
        verbose_name="Detalle",
    )
    stock = models.PositiveIntegerField(
        default=0,
        verbose_name="Stock",
        validators=[MinValueValidator(0)],
    )
    costo = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Costo (Bs)",
        validators=[MinValueValidator(Decimal("0"))],
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "Producto"
        verbose_name_plural = "Productos"

    def __str__(self):
        return self.nombre
