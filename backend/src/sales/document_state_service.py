"""
document_state_service.py
*
* Single Responsibility (SRP): implementar la máquina de estados finita
* (FSM) del documento de venta. Decide qué transiciones son válidas y
* qué efectos colaterales dispara (registro de caja, reserva/liberación
* de stock, descuento físico de stock, cierre).
*
* Open/Closed (OCP): la tabla TRANSITIONS define las reglas en un solo
* lugar. Agregar un nuevo estado o transición solo requiere editar esta
* tabla y agregar el handler correspondiente en _apply_side_effects.
*
* Liskov Substitution (LSP): los handlers son funciones puras que operan
* sobre el modelo Document; cualquier implementación alternativa que
* respete la firma puede sustituirlas.
*
* Dependency Inversion (DIP): el servicio depende de la abstracción
* StockService (inyectada por parámetro) para mutar el stock físico y
* las reservas — no conoce detalles de BD de productos.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Callable, Dict, Optional, Tuple

from django.db import transaction as db_transaction
from django.utils import timezone

from products.models import Product
from .models import CashEntry, Document, DocumentItem, StockReservation


# ---------------------------------------------------------------------------
# Excepciones de dominio
# ---------------------------------------------------------------------------

class DocumentStateError(Exception):
    """Transición inválida o datos insuficientes para cambiar de estado."""


class InsufficientStockError(DocumentStateError):
    """Stock físico insuficiente para confirmar el recibo final."""

    def __init__(self, product_id: int, requested: Decimal, available: Decimal):
        self.product_id = product_id
        self.requested = requested
        self.available = available
        super().__init__(
            f"Stock insuficiente para producto {product_id}: "
            f"solicitado {requested}, disponible {available}."
        )


# ---------------------------------------------------------------------------
# Contrato del servicio de stock (abstracción para DIP)
# ---------------------------------------------------------------------------

class StockServiceProtocol:
    """
    Interfaz esperada del servicio de stock.

    Cualquier implementación (incluyendo mocks para tests) que respete
    estos métodos puede sustituir al StockService concreto (LSP).
    """

    def reserve(self, document: Document) -> None:  # pragma: no cover
        raise NotImplementedError

    def release(self, document: Document) -> None:  # pragma: no cover
        raise NotImplementedError

    def decrease_physical(self, document: Document) -> None:  # pragma: no cover
        raise NotImplementedError

    def available_for(self, product: Product) -> Decimal:  # pragma: no cover
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Tipos de transición
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Transition:
    """Definición declarativa de una transición válida."""

    from_state: str
    to_state: str
    label: str
    needs_amount: bool = False
    needs_reserve: bool = False
    needs_stock_validation: bool = False
    decreases_stock: bool = False
    closes_document: bool = False


# Tabla de transiciones (OCP: añadir aquí nuevas transiciones).
TRANSITIONS: Dict[str, Transition] = {
    # Proforma → Recibo de Anticipo
    "pay_advance": Transition(
        from_state=Document.State.PROFORMA,
        to_state=Document.State.RECIBO_ANTICIPO,
        label="Registrar anticipo",
        needs_amount=True,
        needs_reserve=True,
    ),
    # Proforma → Recibo Final (pago total directo)
    "pay_total": Transition(
        from_state=Document.State.PROFORMA,
        to_state=Document.State.RECIBO_FINAL,
        label="Pago total directo",
        needs_amount=True,
        needs_stock_validation=True,
        decreases_stock=True,
    ),
    # Recibo Anticipo → Proforma (revertir)
    "revert_to_proforma": Transition(
        from_state=Document.State.RECIBO_ANTICIPO,
        to_state=Document.State.PROFORMA,
        label="Revertir a proforma",
    ),
    # Recibo Anticipo → Recibo Final (liquidar saldo)
    "settle_final": Transition(
        from_state=Document.State.RECIBO_ANTICIPO,
        to_state=Document.State.RECIBO_FINAL,
        label="Liquidar saldo",
        needs_amount=True,
        needs_stock_validation=True,
        decreases_stock=True,
    ),
    # Recibo Final → Cerrado (cierre del documento)
    "close": Transition(
        from_state=Document.State.RECIBO_FINAL,
        to_state=Document.State.CERRADO,
        label="Cerrar documento",
        closes_document=True,
    ),
}


# ---------------------------------------------------------------------------
# Resultado de una transición
# ---------------------------------------------------------------------------

@dataclass
class TransitionResult:
    document: Document
    transition: Transition
    cash_entry: Optional[CashEntry] = None
    side_effects: list = None

    def __post_init__(self):
        if self.side_effects is None:
            self.side_effects = []


# ---------------------------------------------------------------------------
# Servicio principal
# ---------------------------------------------------------------------------

class DocumentStateService:
    """
    Orquesta transiciones de estado del documento.

    SRP: solo conoce la FSM y dispara side effects vía colaboradores
    (StockServiceProtocol). No conoce HTTP ni serializers.
    """

    def __init__(self, stock_service: StockServiceProtocol):
        # DIP: depende de la abstracción, no de una implementación concreta.
        self._stock = stock_service

    # --- API pública -------------------------------------------------------

    def available_transitions(self, document: Document) -> list:
        """Lista de transiciones aplicables al estado actual."""
        return [
            (key, t)
            for key, t in TRANSITIONS.items()
            if t.from_state == document.state
        ]

    def apply(
        self,
        document: Document,
        transition_key: str,
        *,
        amount: Optional[Decimal] = None,
        note: str = "",
    ) -> TransitionResult:
        """Aplica una transición al documento.

        Lanza DocumentStateError si la transición no es válida o faltan
        datos. Envuelve toda la operación en una transacción de BD.
        """
        transition = TRANSITIONS.get(transition_key)
        if transition is None:
            raise DocumentStateError(f"Transición desconocida: {transition_key}")

        if document.state != transition.from_state:
            raise DocumentStateError(
                f"Transición '{transition_key}' no permitida desde el estado "
                f"'{document.state}' (se requiere '{transition.from_state}')."
            )

        if transition.needs_amount and (amount is None or amount <= 0):
            raise DocumentStateError(
                f"La transición '{transition_key}' requiere un monto positivo."
            )

        with db_transaction.atomic():
            # Validación previa de stock si aplica.
            if transition.needs_stock_validation:
                self._validate_stock(document)

            cash_entry = None
            if transition.needs_amount:
                cash_entry = self._register_cash(
                    document=document,
                    amount=Decimal(amount),
                    kind=self._cash_kind_for(transition),
                    note=note,
                )

            # Reserva de stock (anticipo).
            if transition.needs_reserve:
                self._stock.reserve(document)

            # Reversión de reserva (volver a proforma).
            if transition_key == "revert_to_proforma":
                self._stock.release(document)
                self._revoke_cash_entries(document, kind=CashEntry.Kind.ANTICIPO)

            # Descuento físico de stock (recibo final).
            if transition.decreases_stock:
                self._stock.decrease_physical(document)

            # Cambio de estado.
            document.state = transition.to_state
            if transition.closes_document:
                document.kind = Document.Kind.RECIBO
            elif transition.to_state in (
                Document.State.RECIBO_ANTICIPO,
                Document.State.RECIBO_FINAL,
            ):
                document.kind = Document.Kind.RECIBO
            elif transition.to_state == Document.State.PROFORMA:
                document.kind = Document.Kind.PROFORMA

            document.save()

        return TransitionResult(
            document=document,
            transition=transition,
            cash_entry=cash_entry,
        )

    # --- Helpers internos --------------------------------------------------

    @staticmethod
    def _cash_kind_for(transition: Transition) -> str:
        if transition.to_state == Document.State.RECIBO_ANTICIPO:
            return CashEntry.Kind.ANTICIPO
        return CashEntry.Kind.LIQUIDACION

    @staticmethod
    def _register_cash(
        *,
        document: Document,
        amount: Decimal,
        kind: str,
        note: str,
    ) -> CashEntry:
        return CashEntry.objects.create(
            document=document,
            kind=kind,
            amount=amount,
            note=note,
        )

    @staticmethod
    def _revoke_cash_entries(document: Document, *, kind: str) -> int:
        return CashEntry.objects.filter(
            document=document, kind=kind, is_revoked=False
        ).update(is_revoked=True)

    def _validate_stock(self, document: Document) -> None:
        """Verifica que haya stock físico suficiente para cada ítem."""
        for item in document.items.all():
            if not item.product_id:
                continue
            available = self._stock.available_for(item.product)
            if item.qty > available:
                raise InsufficientStockError(
                    product_id=item.product_id,
                    requested=item.qty,
                    available=available,
                )
