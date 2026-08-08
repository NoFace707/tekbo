"""
stock_service.py

Implementación concreta de StockServiceProtocol.

Single Responsibility (SRP): mutar el estado de stock físico y las
reservas asociadas a documentos. No decide CUÁNDO hacerlo (eso lo hace
DocumentStateService); solo sabe CÓMO.

Liskov Substitution (LSP): cumple el contrato definido en
StockServiceProtocol, por lo que puede sustituirse por mocks en tests.

Dependency Inversion (DIP): el DocumentStateService depende de la
abstracción; este módulo es la implementación inyectable.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Iterable

from django.db import transaction as db_transaction
from django.db.models import F, Sum
from django.utils import timezone

from products.models import Product
from .models import Document, StockReservation


class StockService:
    """Implementa StockServiceProtocol."""

    # --- Lectura ----------------------------------------------------------

    def available_for(self, product: Product) -> Decimal:
        """
        Stock disponible = stock físico − reservas activas.

        Las reservas activas son las que no han sido liberadas (released_at IS NULL)
        y pertenecen a documentos que NO están en estado CERRADO (esas ya
        descontaron el físico).
        """
        reserved = self._active_reservations_qs(product).aggregate(
            total=Sum("qty")
        )["total"] or Decimal("0")
        return Decimal(product.stock) - Decimal(reserved)

    # --- Mutación ---------------------------------------------------------

    @db_transaction.atomic
    def reserve(self, document: Document) -> None:
        """
        Crea reservas de stock para cada ítem con producto del documento.
        Solo se llama al pagar anticipo (desde PROFORMA).
        """
        for item in document.items.all():
            if not item.product_id or item.qty <= 0:
                continue
            StockReservation.objects.create(
                document=document,
                product=item.product,
                qty=item.qty,
            )

    @db_transaction.atomic
    def release(self, document: Document) -> None:
        """
        Libera las reservas activas del documento (al revertir a proforma).
        No toca el stock físico.
        """
        now = timezone.now()
        StockReservation.objects.filter(
            document=document, released_at__isnull=True
        ).update(released_at=now)

    @db_transaction.atomic
    def decrease_physical(self, document: Document) -> None:
        """
        Descuenta el stock físico de cada producto según las cantidades
        del documento, y libera las reservas activas (ya no son necesarias
        porque el físico fue consumido).
        """
        for item in document.items.all():
            if not item.product_id or item.qty <= 0:
                continue
            Product.objects.filter(pk=item.product_id).update(
                stock=F("stock") - item.qty
            )
        # Liberar reservas activas del documento.
        now = timezone.now()
        StockReservation.objects.filter(
            document=document, released_at__isnull=True
        ).update(released_at=now)

    # --- Helpers ----------------------------------------------------------

    def _active_reservations_qs(self, product: Product):
        return StockReservation.objects.filter(
            product=product,
            released_at__isnull=True,
            document__state__in=[
                Document.State.RECIBO_ANTICIPO,
                Document.State.RECIBO_FINAL,
            ],
        )


# Instancia singleton inyectable (DIP): el viewset importa esta instancia
# y la pasa al DocumentStateService.
default_stock_service = StockService()
