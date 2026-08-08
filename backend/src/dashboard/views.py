from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product
from sales.models import CashEntry, Document
from sales.metrics_service import default_sales_metrics_service
from users.models import User
from users.permissions import IsAdminOrSupervisor


def _seller_metrics_to_dict(m):
    """Serializa un SellerSalesMetrics a dict para la respuesta JSON.

    Single Responsibility: solo mapea dataclass → dict. Si la dataclass
    cambia de campos, se edita aquí sin tocar los views.
    """
    return {
        "vendedor_id": m.vendedor_id,
        "vendedor_name": m.vendedor_name,
        "proformas_emitidas": m.proformas_emitidas,
        "anticipos_en_curso": m.anticipos_en_curso,
        "ventas_cerradas": m.ventas_cerradas,
        "recibos_anticipo": m.recibos_anticipo,
        "conversion_proforma": str(m.conversion_proforma),
        "total_ventas_anticipo": str(m.total_ventas_anticipo),
        "caja_cobrada": str(m.caja_cobrada),
    }


def _team_summary_to_dict(team):
    """Serializa un TeamSalesMetrics a dict (incluye ranking)."""
    return {
        "proformas_emitidas": team.proformas_emitidas,
        "anticipos_en_curso": team.anticipos_en_curso,
        "ventas_cerradas": team.ventas_cerradas,
        "recibos_anticipo": team.recibos_anticipo,
        "conversion_proforma": str(team.conversion_proforma),
        "total_ventas_anticipo": str(team.total_ventas_anticipo),
        "caja_cobrada": str(team.caja_cobrada),
        "vendedores_activos": User.objects.filter(
            role=User.Role.VENDEDOR, is_active_employee=True
        ).count(),
        "ranking": [_seller_metrics_to_dict(m) for m in team.vendedores],
    }


class DashboardView(APIView):
    """KPIs por rol.

    - admin:      totales globales + breakdown.
    - supervisor: KPIs comerciales del equipo (general) + ranking por vendedor.
    - vendedor:   métricas personales.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.is_admin:
            return Response(self._admin_data())
        if user.is_supervisor:
            return Response(self._supervisor_data(user))
        return Response(self._vendedor_data(user))

    # ------------------------------------------------------------
    # Builders
    # ------------------------------------------------------------
    def _admin_data(self):
        total = User.objects.count()
        by_role = {
            role: User.objects.filter(role=role).count()
            for role, _ in User.Role.choices
        }
        active = User.objects.filter(is_active=True).count()
        inactive = User.objects.filter(is_active=False).count()
        active_employees = User.objects.filter(is_active_employee=True).exclude(
            role=User.Role.ADMIN
        ).count()
        new_last_7d = User.objects.filter(
            date_joined__gte=timezone.now() - timedelta(days=7)
        ).count()

        # KPIs del catálogo de productos.
        products_total = Product.objects.count()
        products_low_stock = Product.objects.filter(stock__lte=0).count()
        products_in_stock = Product.objects.filter(stock__gt=0).count()

        # KPIs de ventas globales (usando el servicio de métricas).
        team = default_sales_metrics_service.team_summary()

        return {
            "role": User.Role.ADMIN,
            "title": "Panel de Administracion",
            "kpis": [
                {
                    "label": "Total usuarios",
                    "value": total,
                    "color": "sky",
                    "icon": "users",
                    "sub": "Cuentas registradas",
                },
                {
                    "label": "Empleados activos",
                    "value": active_employees,
                    "color": "emerald",
                    "icon": "check",
                    "sub": "Supervisores y vendedores activos",
                },
                {
                    "label": "Productos",
                    "value": products_total,
                    "color": "violet",
                    "icon": "shield",
                    "sub": f"{products_in_stock} en stock · {products_low_stock} agotados",
                },
                {
                    "label": "Caja acumulada",
                    "value": f"{team.caja_cobrada:.2f} Bs",
                    "color": "emerald",
                    "icon": "cart",
                    "sub": f"{team.ventas_cerradas} ventas cerradas · {team.proformas_emitidas} proformas emitidas",
                },
            ],
            "breakdown": {
                "by_role": by_role,
                "active": active,
                "inactive": inactive,
                "new_last_7d": new_last_7d,
                "products_total": products_total,
                "products_low_stock": products_low_stock,
                "products_in_stock": products_in_stock,
                "sales_proformas": team.proformas_emitidas,
                "sales_anticipos": team.anticipos_en_curso,
                "sales_cerrados": team.ventas_cerradas,
                "cash_total": str(team.caja_cobrada),
            },
            "recent_users": self._recent_users(5),
        }

    def _supervisor_data(self, user):
        """Dashboard del supervisor.

        Estructura:
            - kpis: 4 KPIs generales del equipo (conversión, anticipos en
              curso, ventas cerradas, proformas emitidas) + extras
              (vendedores activos, caja).
            - team: resumen global + ranking por vendedor con las mismas
              4 métricas para que el frontend muestre la tabla comparativa.
        """
        vendedores_activos = User.objects.filter(
            role=User.Role.VENDEDOR, is_active_employee=True
        ).count()
        vendedores_total = User.objects.filter(role=User.Role.VENDEDOR).count()
        team = default_sales_metrics_service.team_summary()

        return {
            "role": User.Role.SUPERVISOR,
            "title": "Panel de Supervisor",
            # 4 KPIs principales requeridos + 2 de contexto.
            "kpis": [
                {
                    "label": "Conversión de proforma",
                    "value": f"{team.conversion_proforma:.2f}%",
                    "color": "emerald",
                    "icon": "check",
                    "sub": "Recibos de anticipo / proformas emitidas (equipo)",
                },
                {
                    "label": "Anticipos en curso",
                    "value": team.anticipos_en_curso,
                    "color": "amber",
                    "icon": "cart",
                    "sub": "Documentos pendientes de liquidación (equipo)",
                },
                {
                    "label": "Ventas cerradas",
                    "value": team.ventas_cerradas,
                    "color": "violet",
                    "icon": "shield",
                    "sub": "Recibos finales y entregas (equipo)",
                },
                {
                    "label": "Proformas emitidas",
                    "value": team.proformas_emitidas,
                    "color": "sky",
                    "icon": "calendar",
                    "sub": "Total de documentos creados (equipo)",
                },
                {
                    "label": "Vendedores activos",
                    "value": vendedores_activos,
                    "color": "violet",
                    "icon": "users",
                    "sub": f"{vendedores_total - vendedores_activos} inactivos",
                },
                {
                    "label": "Caja cobrada",
                    "value": f"{team.caja_cobrada:.2f} Bs",
                    "color": "emerald",
                    "icon": "cart",
                    "sub": "Acumulado no anulado (equipo)",
                },
            ],
            "breakdown": {
                "vendedores_activos": vendedores_activos,
                "vendedores_inactivos": vendedores_total - vendedores_activos,
                "conversion_proforma": str(team.conversion_proforma),
                "recibos_anticipo": team.recibos_anticipo,
                "total_ventas_anticipo": str(team.total_ventas_anticipo),
                "proformas_emitidas": team.proformas_emitidas,
                "anticipos_en_curso": team.anticipos_en_curso,
                "ventas_cerradas": team.ventas_cerradas,
                "caja_cobrada": str(team.caja_cobrada),
            },
            # Resumen del equipo con ranking por vendedor.
            "team": _team_summary_to_dict(team),
            "recent_users": self._recent_users(5, role=User.Role.VENDEDOR),
        }

    def _vendedor_data(self, user):
        days_since_join = (timezone.now() - user.date_joined).days

        # KPIs de ventas del vendedor.
        my_docs = Document.objects.filter(vendedor=user)
        my_proformas = my_docs.filter(state=Document.State.PROFORMA).count()
        my_anticipos = my_docs.filter(state=Document.State.RECIBO_ANTICIPO).count()
        my_cerrados = my_docs.filter(
            state__in=[Document.State.RECIBO_FINAL, Document.State.CERRADO]
        ).count()
        my_cash = (
            CashEntry.objects.filter(
                document__vendedor=user, is_revoked=False
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )

        return {
            "role": User.Role.VENDEDOR,
            "title": "Panel de Vendedor",
            "kpis": [
                {
                    "label": "Proformas activas",
                    "value": my_proformas,
                    "color": "sky",
                    "icon": "calendar",
                    "sub": "Sin impacto en stock ni caja",
                },
                {
                    "label": "Anticipos en curso",
                    "value": my_anticipos,
                    "color": "amber",
                    "icon": "cart",
                    "sub": "Stock reservado opcional",
                },
                {
                    "label": "Ventas cerradas",
                    "value": my_cerrados,
                    "color": "emerald",
                    "icon": "check",
                    "sub": "Stock descontado físicamente",
                },
                {
                    "label": "Caja cobrada",
                    "value": f"{my_cash:.2f} Bs",
                    "color": "emerald",
                    "icon": "phone",
                    "sub": "Total acumulado no anulado",
                },
            ],
            "user": {
                "username": user.username,
                "full_name": (f"{user.first_name} {user.last_name}".strip() or user.username),
                "email": user.email,
                "phone": user.phone,
                "date_joined": user.date_joined,
            },
        }

    # ------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------
    def _recent_users(self, limit=5, role=None):
        qs = User.objects.all()
        if role:
            qs = qs.filter(role=role)
        qs = qs.order_by("-date_joined")[:limit]
        return [
            {
                "id": u.id,
                "username": u.username,
                "full_name": (f"{u.first_name} {u.last_name}".strip() or u.username),
                "email": u.email,
                "role": u.role,
                "role_display": u.get_role_display(),
                "is_active": u.is_active,
                "date_joined": u.date_joined,
            }
            for u in qs
        ]


class TeamDashboardView(APIView):
    """Endpoint separado para el resumen del equipo de ventas.

    SRP: este endpoint solo devuelve el resumen del equipo (global +
    por vendedor). El DashboardView principal devuelve el dashboard
    personal del rol.

    Open/Closed: agregar nuevos campos al team summary se hace en
    SalesMetricsService.team_summary() sin tocar este view.

    Permite que el frontend refresque solo la sección "Por vendedor"
    sin tener que recargar todo el dashboard.
    """

    permission_classes = [IsAuthenticated, IsAdminOrSupervisor]

    def get(self, request):
        team = default_sales_metrics_service.team_summary()
        return Response(_team_summary_to_dict(team))
