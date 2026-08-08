"""
Modelos del módulo de ventas Tekbo.

Single Responsibility: cada modelo representa una entidad de dominio y
solo guarda/recupera sus propios datos. La lógica de transición de
estado vive en services/document_state_service.py (Open/Closed).

Modelos:
    - Document         : el documento (proforma / anticipo / final).
    - DocumentItem     : cada línea de detalle del documento.
    - StockReservation : reservas de stock creadas al pagar anticipo.
    - CashEntry        : entradas de caja (anticipos y cobros finales).

Estados del documento (FSM):

    PROFORMA  ──(pagar anticipo)──►  RECIBO_ANTICIPO
    PROFORMA  ──(pagar total)─────►  RECIBO_FINAL
    RECIBO_ANTICIPO  ──(revertir)──►  PROFORMA
    RECIBO_ANTICIPO  ──(liquidar)──►  RECIBO_FINAL
    RECIBO_FINAL  ──(cerrar)───────►  CERRADO  (terminal)
"""

from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class Document(models.Model):
    """Documento de venta Tekbo (proforma, anticipo o recibo final)."""

    class State(models.TextChoices):
        PROFORMA = "proforma", "Proforma"
        RECIBO_ANTICIPO = "recibo_anticipo", "Recibo de Anticipo"
        RECIBO_FINAL = "recibo_final", "Recibo Final / Entrega"
        CERRADO = "cerrado", "Cerrado"

    class Kind(models.TextChoices):
        PROFORMA = "proforma", "Proforma"
        RECIBO = "recibo", "Recibo"

    # Identificación del documento.
    code = models.CharField(
        max_length=40,
        unique=True,
        db_index=True,
        verbose_name="Código",
    )
    state = models.CharField(
        max_length=30,
        choices=State.choices,
        default=State.PROFORMA,
        verbose_name="Estado",
        db_index=True,
    )

    # Relación con el vendedor que emite el documento.
    vendedor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="documents",
        verbose_name="Vendedor",
    )

    # Datos del cliente (snapshot, no FK a un modelo de cliente).
    cliente = models.CharField(max_length=200, verbose_name="Cliente")
    fecha = models.CharField(max_length=20, verbose_name="Fecha")
    direccion = models.CharField(
        max_length=300, blank=True, default="", verbose_name="Dirección"
    )
    celular = models.CharField(
        max_length=30, blank=True, default="", verbose_name="Celular"
    )

    # Datos financieros.
    descuento = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Descuento (Bs)",
    )

    # ¿Es proforma o recibo? (informativo; el estado real está en `state`).
    kind = models.CharField(
        max_length=20,
        choices=Kind.choices,
        default=Kind.PROFORMA,
        verbose_name="Tipo",
    )

    # Auditoría.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Documento"
        verbose_name_plural = "Documentos"

    def __str__(self):
        return f"{self.code} ({self.get_state_display()})"


class DocumentItem(models.Model):
    """Línea de detalle de un documento."""

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Documento",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="document_items",
        verbose_name="Producto",
        null=True,
        blank=True,
    )
    desc = models.CharField(max_length=200, verbose_name="Descripción")
    qty = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("1"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Cantidad",
    )
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="P. Unit (Bs)",
    )

    class Meta:
        ordering = ["id"]
        verbose_name = "Ítem de documento"
        verbose_name_plural = "Ítems de documento"

    def __str__(self):
        return f"{self.desc} ×{self.qty}"

    @property
    def total(self):
        return (self.qty or Decimal("0")) * (self.price or Decimal("0"))


class StockReservation(models.Model):
    """
    Reserva de stock opcional creada al pagar un anticipo.

    No modifica el stock físico (eso lo hace el Recibo Final); solo
    representa el compromiso. Stock Libre = Stock Físico − Σ reservas.
    """

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="reservations",
        verbose_name="Documento",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="reservations",
        verbose_name="Producto",
    )
    qty = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Cantidad reservada",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    released_at = models.DateTimeField(null=True, blank=True, verbose_name="Liberada el")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Reserva de stock"
        verbose_name_plural = "Reservas de stock"

    def __str__(self):
        return f"Reserva {self.product} ×{self.qty} ({self.document.code})"


class CashEntry(models.Model):
    """
    Entrada de caja: anticipo o cobro final asociado a un documento.

    Single Responsibility: registrar dinero entrante. Las anulaciones
    se representan con is_revoked=True (no se borra el registro para
    mantener auditoría).
    """

    class Kind(models.TextChoices):
        ANTICIPO = "anticipo", "Anticipo"
        LIQUIDACION = "liquidacion", "Liquidación / Cobro final"

    document = models.ForeignKey(
        Document,
        on_delete=models.PROTECT,
        related_name="cash_entries",
        verbose_name="Documento",
    )
    kind = models.CharField(
        max_length=20,
        choices=Kind.choices,
        default=Kind.ANTICIPO,
        verbose_name="Tipo",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Monto (Bs)",
    )
    is_revoked = models.BooleanField(
        default=False,
        verbose_name="Anulada",
        help_text="True si se revirtió el cobro (p. ej. al volver a proforma).",
    )
    note = models.CharField(max_length=300, blank=True, default="", verbose_name="Nota")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Entrada de caja"
        verbose_name_plural = "Entradas de caja"

    def __str__(self):
        tag = " (anulada)" if self.is_revoked else ""
        return f"{self.get_kind_display()} {self.amount} Bs · {self.document.code}{tag}"
