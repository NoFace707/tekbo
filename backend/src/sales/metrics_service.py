"""Consultas de métricas comerciales independientes de la capa HTTP.

Single Responsibility (SRP): este módulo solo calcula KPIs a partir de
QuerySets de Document/CashEntry. No conoce vistas ni serializers.

Open/Closed (OCP): agregar un nuevo KPI se hace extendiendo las
dataclasses o agregando un método, sin tocar los existentes.

Liskov Substitution (LSP): las dataclasses son inmutables y los métodos
son funciones puras sobre QuerySets → fáciles de testear y sustituir.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Iterable, List, Optional

from django.db.models import QuerySet, Sum

from users.models import User
from .models import CashEntry, Document


# ---------------------------------------------------------------------------
# Dataclasses de resultado (inmutables para LSP)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class AdvanceConversionMetrics:
    """Valores necesarios para medir conversión de proformas a anticipo."""

    proformas_emitidas: int
    recibos_anticipo: int
    total_ventas_anticipo: Decimal

    @property
    def conversion_proforma(self) -> Decimal:
        if not self.proformas_emitidas:
            return Decimal("0.00")
        return (
            Decimal(self.recibos_anticipo)
            / Decimal(self.proformas_emitidas)
            * Decimal("100")
        ).quantize(Decimal("0.01"))


@dataclass(frozen=True)
class SellerSalesMetrics:
    """Métricas comerciales de un vendedor concreto.

    Cuatro KPIs requeridos por el dashboard del supervisor:
        - proformas_emitidas    : total de documentos creados por el vendedor.
        - anticipos_en_curso    : documentos en estado RECIBO_ANTICIPO.
        - ventas_cerradas       : documentos en RECIBO_FINAL o CERRADO.
        - conversion_proforma   : % de proformas emitidas que llegaron a
                                  tener al menos un anticipo activo.

    Adicionalmente se exponen para tablas de ranking:
        - total_ventas_anticipo : monto total de anticipos activos.
        - caja_cobrada          : monto total no anulado (anticipos + liquidaciones).
    """

    vendedor_id: int
    vendedor_name: str
    proformas_emitidas: int = 0
    anticipos_en_curso: int = 0
    ventas_cerradas: int = 0
    recibos_anticipo: int = 0
    total_ventas_anticipo: Decimal = Decimal("0.00")
    caja_cobrada: Decimal = Decimal("0.00")

    @property
    def conversion_proforma(self) -> Decimal:
        if not self.proformas_emitidas:
            return Decimal("0.00")
        return (
            Decimal(self.recibos_anticipo)
            / Decimal(self.proformas_emitidas)
            * Decimal("100")
        ).quantize(Decimal("0.01"))


@dataclass(frozen=True)
class TeamSalesMetrics:
    """Resumen global del equipo de ventas + desglose por vendedor."""

    proformas_emitidas: int = 0
    anticipos_en_curso: int = 0
    ventas_cerradas: int = 0
    recibos_anticipo: int = 0
    total_ventas_anticipo: Decimal = Decimal("0.00")
    caja_cobrada: Decimal = Decimal("0.00")
    vendedores: List[SellerSalesMetrics] = field(default_factory=list)

    @property
    def conversion_proforma(self) -> Decimal:
        if not self.proformas_emitidas:
            return Decimal("0.00")
        return (
            Decimal(self.recibos_anticipo)
            / Decimal(self.proformas_emitidas)
            * Decimal("100")
        ).quantize(Decimal("0.01"))


# ---------------------------------------------------------------------------
# Servicio
# ---------------------------------------------------------------------------


class SalesMetricsService:
    """Calcula KPIs de ventas sin conocer vistas ni serializers (SRP/DIP).

    Todos los métodos aceptan un QuerySet opcional para que el caller
    pueda restringir el alcance (p. ej. solo documentos de un vendedor).
    Si no se pasa nada, se usan todos los documentos.
    """

    # --- Métricas globales de conversión (ya existente) ------------------

    def advance_conversion(
        self, documents: QuerySet | None = None
    ) -> AdvanceConversionMetrics:
        documents = documents if documents is not None else Document.objects.all()
        advances = CashEntry.objects.filter(
            document__in=documents,
            kind=CashEntry.Kind.ANTICIPO,
            is_revoked=False,
        )
        return AdvanceConversionMetrics(
            # Todo Document nace como proforma, aunque después cambie de estado.
            proformas_emitidas=documents.count(),
            recibos_anticipo=advances.values("document_id").distinct().count(),
            total_ventas_anticipo=advances.aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00"),
        )

    # --- Métricas de un vendedor concreto ---------------------------------

    def seller_summary(self, vendedor: User) -> SellerSalesMetrics:
        """Calcula los 4 KPIs requeridos para un vendedor."""
        docs = Document.objects.filter(vendedor=vendedor)
        proformas_emitidas = docs.count()
        anticipos_en_curso = docs.filter(
            state=Document.State.RECIBO_ANTICIPO
        ).count()
        ventas_cerradas = docs.filter(
            state__in=[Document.State.RECIBO_FINAL, Document.State.CERRADO]
        ).count()

        # Anticipos activos (no revocados) sobre documentos del vendedor.
        advances = CashEntry.objects.filter(
            document__vendedor=vendedor,
            kind=CashEntry.Kind.ANTICIPO,
            is_revoked=False,
        )
        recibos_anticipo = advances.values("document_id").distinct().count()
        total_ventas_anticipo = advances.aggregate(total=Sum("amount"))["total"] or Decimal(
            "0.00"
        )

        # Caja total cobrada (anticipos + liquidaciones, no revocados).
        caja_cobrada = (
            CashEntry.objects.filter(
                document__vendedor=vendedor, is_revoked=False
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0.00")
        )

        full_name = f"{vendedor.first_name} {vendedor.last_name}".strip()
        return SellerSalesMetrics(
            vendedor_id=vendedor.id,
            vendedor_name=full_name or vendedor.username,
            proformas_emitidas=proformas_emitidas,
            anticipos_en_curso=anticipos_en_curso,
            ventas_cerradas=ventas_cerradas,
            recibos_anticipo=recibos_anticipo,
            total_ventas_anticipo=total_ventas_anticipo,
            caja_cobrada=caja_cobrada,
        )

    # --- Métricas del equipo completo ------------------------------------

    def team_summary(
        self, vendedores: Optional[Iterable[User]] = None
    ) -> TeamSalesMetrics:
        """Agrega las métricas de todos los vendedores activos.

        Por defecto considera solo vendedores marcados como empleados
        activos, pero el caller puede pasar un QuerySet/iterable propio.
        """
        if vendedores is None:
            vendedores = User.objects.filter(
                role=User.Role.VENDEDOR, is_active_employee=True
            ).order_by("first_name", "last_name", "username")

        seller_metrics: List[SellerSalesMetrics] = []
        for v in vendedores:
            seller_metrics.append(self.seller_summary(v))

        return TeamSalesMetrics(
            proformas_emitidas=sum(m.proformas_emitidas for m in seller_metrics),
            anticipos_en_curso=sum(m.anticipos_en_curso for m in seller_metrics),
            ventas_cerradas=sum(m.ventas_cerradas for m in seller_metrics),
            recibos_anticipo=sum(m.recibos_anticipo for m in seller_metrics),
            total_ventas_anticipo=sum(
                (m.total_ventas_anticipo for m in seller_metrics), Decimal("0.00")
            ),
            caja_cobrada=sum(
                (m.caja_cobrada for m in seller_metrics), Decimal("0.00")
            ),
            vendedores=seller_metrics,
        )


# Instancia singleton inyectable (DIP).
default_sales_metrics_service = SalesMetricsService()
