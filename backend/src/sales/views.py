"""
ViewSet del módulo de ventas.

Single Responsibility (SRP): exponer CRUD REST + endpoints de transición
de estado. No implementa lógica de negocio (eso vive en
DocumentStateService) ni validación de campos (eso vive en serializers).

Open/Closed (OCP): nuevas transiciones se agregan como @action sin tocar
los métodos estándar.
"""

from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.exceptions import APIException

from .document_state_service import (
    DocumentStateError,
    DocumentStateService,
    InsufficientStockError,
)
from .models import Document
from .permissions import IsAdminOrDocumentOwner
from .serializers import DocumentReadSerializer, DocumentWriteSerializer
from .stock_service import default_stock_service


# El servicio de estado se compone con su dependencia (StockService) en
# tiempo de construcción (DIP).
_state_service = DocumentStateService(stock_service=default_stock_service)


class DocumentDeletionBlocked(APIException):
    """Evita borrar documentos que todavía tienen dinero vigente."""

    status_code = status.HTTP_409_CONFLICT
    default_code = "document_deletion_blocked"
    default_detail = (
        "No se puede eliminar el documento porque tiene cobros vigentes. "
        "Anula o revierte esos cobros antes de eliminarlo."
    )


class DocumentViewSet(viewsets.ModelViewSet):
    """CRUD + transiciones de estado de documentos de venta Tekbo."""

    queryset = (
        Document.objects.select_related("vendedor")
        .prefetch_related("items", "cash_entries", "reservations__product")
        .order_by("-created_at")
    )
    permission_classes = [IsAdminOrDocumentOwner]
    parser_classes = [JSONParser]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return DocumentWriteSerializer
        return DocumentReadSerializer

    def perform_destroy(self, instance):
        """Elimina el documento y sus movimientos ya anulados de forma atómica."""
        if instance.cash_entries.filter(is_revoked=False).exists():
            raise DocumentDeletionBlocked()

        with transaction.atomic():
            # CashEntry usa PROTECT para preservar auditoría en operaciones
            # normales; aquí se permite limpiar explícitamente solo entradas
            # ya anuladas como parte de la eliminación solicitada por el dueño.
            instance.cash_entries.filter(is_revoked=True).delete()
            instance.delete()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Admin y supervisor auditan todo; vendedor solo sus documentos.
        can_audit_all = getattr(user, "is_admin", False) or getattr(
            user, "is_supervisor", False
        )
        if not can_audit_all:
            qs = qs.filter(vendedor=user)

        vendedor_id = self.request.query_params.get("vendedor")
        if vendedor_id and can_audit_all:
            qs = qs.filter(vendedor_id=vendedor_id)

        # Filtros opcionales.
        state = self.request.query_params.get("state")
        if state:
            qs = qs.filter(state=state)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(cliente__icontains=search)
                | Q(code__icontains=search)
                | Q(vendedor__username__icontains=search)
                | Q(vendedor__first_name__icontains=search)
                | Q(vendedor__last_name__icontains=search)
            )

        return qs

    # ------------------------------------------------------------------
    # Endpoint: transiciones disponibles
    # ------------------------------------------------------------------
    @action(detail=True, methods=["get"])
    def available_transitions(self, request, pk=None):
        """Lista de transiciones aplicables al documento."""
        document = self.get_object()
        transitions = [
            {"key": key, "label": t.label, "needs_amount": t.needs_amount}
            for key, t in _state_service.available_transitions(document)
        ]
        return Response({"transitions": transitions})

    # ------------------------------------------------------------------
    # Endpoint: aplicar una transición
    # ------------------------------------------------------------------
    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        """
        Aplica una transición al documento.

        Body:
            {
              "transition": "pay_advance" | "pay_total" |
                            "revert_to_proforma" | "settle_final" | "close",
              "amount": 123.45,    # solo si la transición lo requiere
              "note": "..."         # opcional
            }
        """
        document = self.get_object()
        transition_key = (request.data or {}).get("transition")
        amount_raw = (request.data or {}).get("amount")
        note = (request.data or {}).get("note", "")

        try:
            amount = Decimal(str(amount_raw)) if amount_raw is not None else None
        except Exception:
            return Response(
                {"detail": "Monto inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = _state_service.apply(
                document=document,
                transition_key=transition_key,
                amount=amount,
                note=note,
            )
        except InsufficientStockError as e:
            return Response(
                {
                    "detail": str(e),
                    "code": "insufficient_stock",
                    "product_id": e.product_id,
                    "requested": str(e.requested),
                    "available": str(e.available),
                },
                status=status.HTTP_409_CONFLICT,
            )
        except DocumentStateError as e:
            return Response(
                {"detail": str(e), "code": "invalid_transition"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            DocumentReadSerializer(result.document).data,
            status=status.HTTP_200_OK,
        )

    # ------------------------------------------------------------------
    # Endpoint: stock disponible para los ítems del documento
    # ------------------------------------------------------------------
    @action(detail=True, methods=["get"])
    def stock_status(self, request, pk=None):
        """
        Devuelve para cada ítem del documento el stock físico, reservado
        y disponible. Útil para mostrar advertencias en el frontend antes
        de confirmar un recibo final.
        """
        document = self.get_object()
        items_status = []
        for item in document.items.all():
            if not item.product_id:
                continue
            product = item.product
            available = default_stock_service.available_for(product)
            items_status.append(
                {
                    "item_id": item.id,
                    "product_id": product.id,
                    "product_name": product.nombre,
                    "requested": str(item.qty),
                    "physical_stock": product.stock,
                    "available": str(available),
                    "enough": item.qty <= available,
                }
            )
        return Response({"items": items_status})
