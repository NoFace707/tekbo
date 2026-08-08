from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from users.models import User

from .metrics_service import SalesMetricsService
from .models import CashEntry, Document


class DocumentVisibilityTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin", email="admin@test.local", role=User.Role.ADMIN
        )
        self.supervisor = User.objects.create_user(
            username="supervisor",
            email="supervisor@test.local",
            role=User.Role.SUPERVISOR,
        )
        self.seller_a = User.objects.create_user(
            username="seller-a", email="a@test.local", role=User.Role.VENDEDOR
        )
        self.seller_b = User.objects.create_user(
            username="seller-b", email="b@test.local", role=User.Role.VENDEDOR
        )
        self.document_a = self._document(self.seller_a, "DOC-A")
        self.document_b = self._document(self.seller_b, "DOC-B")
        self.client = APIClient()

    @staticmethod
    def _document(seller, code):
        return Document.objects.create(
            code=code,
            vendedor=seller,
            cliente="Cliente",
            fecha="2026-08-01",
        )

    def test_supervisor_and_admin_can_read_every_sellers_documents(self):
        for manager in (self.admin, self.supervisor):
            self.client.force_authenticate(manager)
            response = self.client.get("/api/sales/")
            self.assertEqual(response.status_code, 200)
            self.assertEqual({item["code"] for item in response.data}, {"DOC-A", "DOC-B"})

    def test_seller_only_reads_own_documents(self):
        self.client.force_authenticate(self.seller_a)
        response = self.client.get("/api/sales/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["code"] for item in response.data], ["DOC-A"])

    def test_supervisor_cannot_modify_another_sellers_document(self):
        self.client.force_authenticate(self.supervisor)
        response = self.client.patch(
            f"/api/sales/{self.document_a.id}/",
            {"cliente": "Cambio no permitido"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_supervisor_cannot_create_a_sale(self):
        self.client.force_authenticate(self.supervisor)
        response = self.client.post(
            "/api/sales/",
            {"cliente": "Cliente", "fecha": "2026-08-01", "items": []},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_seller_can_delete_own_saved_document(self):
        self.client.force_authenticate(self.seller_a)
        response = self.client.delete(f"/api/sales/{self.document_a.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Document.objects.filter(pk=self.document_a.id).exists())

    def test_seller_can_delete_document_with_revoked_cash_entries(self):
        CashEntry.objects.create(
            document=self.document_a,
            kind=CashEntry.Kind.ANTICIPO,
            amount=Decimal("100.00"),
            is_revoked=True,
        )
        self.client.force_authenticate(self.seller_a)

        response = self.client.delete(f"/api/sales/{self.document_a.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Document.objects.filter(pk=self.document_a.id).exists())
        self.assertFalse(CashEntry.objects.filter(document_id=self.document_a.id).exists())

    def test_cannot_delete_document_with_active_cash_entries(self):
        CashEntry.objects.create(
            document=self.document_a,
            kind=CashEntry.Kind.ANTICIPO,
            amount=Decimal("100.00"),
        )
        self.client.force_authenticate(self.seller_a)

        response = self.client.delete(f"/api/sales/{self.document_a.id}/")

        self.assertEqual(response.status_code, 409)
        self.assertTrue(Document.objects.filter(pk=self.document_a.id).exists())

    def test_supervisor_dashboard_exposes_requested_sales_kpis(self):
        """El dashboard del supervisor expone las 4 métricas requeridas
        (conversión, anticipos en curso, ventas cerradas, proformas emitidas)
        más KPIs de contexto (vendedores activos, caja cobrada).
        También expone el ranking por vendedor en `team.ranking`.
        """
        CashEntry.objects.create(
            document=self.document_a,
            kind=CashEntry.Kind.ANTICIPO,
            amount=Decimal("250.00"),
        )
        self.document_a.state = Document.State.RECIBO_ANTICIPO
        self.document_a.save(update_fields=["state"])
        self.client.force_authenticate(self.supervisor)

        response = self.client.get("/api/dashboard/")

        self.assertEqual(response.status_code, 200)
        labels = [kpi["label"] for kpi in response.data["kpis"]]

        # Las 4 métricas requeridas deben estar presentes.
        self.assertIn("Conversión de proforma", labels)
        self.assertIn("Anticipos en curso", labels)
        self.assertIn("Ventas cerradas", labels)
        self.assertIn("Proformas emitidas", labels)

        # KPIs de contexto adicionales.
        self.assertIn("Vendedores activos", labels)
        self.assertIn("Caja cobrada", labels)

        # Los 4 KPIs requeridos deben ir primero (en orden).
        first_four = labels[:4]
        self.assertEqual(
            first_four,
            [
                "Conversión de proforma",
                "Anticipos en curso",
                "Ventas cerradas",
                "Proformas emitidas",
            ],
        )

        # Breakdown con los agregados del equipo.
        self.assertEqual(response.data["breakdown"]["conversion_proforma"], "50.00")
        # Decimal("250.00") se serializa como "250.00" (preserva 2 decimales).
        self.assertEqual(
            Decimal(response.data["breakdown"]["total_ventas_anticipo"]),
            Decimal("250"),
        )
        self.assertEqual(response.data["breakdown"]["proformas_emitidas"], 2)
        self.assertEqual(response.data["breakdown"]["anticipos_en_curso"], 1)
        self.assertEqual(response.data["breakdown"]["ventas_cerradas"], 0)

        # La sección team debe traer el ranking por vendedor con las 4 métricas.
        self.assertIn("team", response.data)
        ranking = response.data["team"]["ranking"]
        self.assertEqual(len(ranking), 2)  # seller_a y seller_b

        # seller_a tiene 1 proforma emitida (convertida a anticipo).
        seller_a_row = next(
            r for r in ranking if r["vendedor_id"] == self.seller_a.id
        )
        self.assertEqual(seller_a_row["proformas_emitidas"], 1)
        self.assertEqual(seller_a_row["anticipos_en_curso"], 1)
        self.assertEqual(seller_a_row["ventas_cerradas"], 0)
        self.assertEqual(seller_a_row["recibos_anticipo"], 1)
        self.assertEqual(
            Decimal(seller_a_row["total_ventas_anticipo"]),
            Decimal("250"),
        )
        self.assertEqual(seller_a_row["conversion_proforma"], "100.00")

        # seller_b tiene 1 proforma emitida, sin conversión.
        seller_b_row = next(
            r for r in ranking if r["vendedor_id"] == self.seller_b.id
        )
        self.assertEqual(seller_b_row["proformas_emitidas"], 1)
        self.assertEqual(seller_b_row["anticipos_en_curso"], 0)
        self.assertEqual(seller_b_row["ventas_cerradas"], 0)
        self.assertEqual(seller_b_row["conversion_proforma"], "0.00")

    def test_admin_active_employees_excludes_admin_users(self):
        self.client.force_authenticate(self.admin)

        response = self.client.get("/api/dashboard/")

        self.assertEqual(response.status_code, 200)
        active_kpi = next(
            kpi for kpi in response.data["kpis"] if kpi["label"] == "Empleados activos"
        )
        self.assertEqual(active_kpi["value"], 3)

    def test_negative_amounts_are_rejected(self):
        self.client.force_authenticate(self.seller_a)
        response = self.client.post(
            "/api/sales/",
            {
                "cliente": "Cliente",
                "fecha": "2026-08-01",
                "descuento": -1,
                "items": [{"desc": "Pantalla", "qty": -1, "price": -10}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("descuento", response.data)

    def test_team_dashboard_endpoint_requires_admin_or_supervisor(self):
        """El endpoint /api/dashboard/team/ debe rechazar a los vendedores."""
        self.client.force_authenticate(self.seller_a)
        response = self.client.get("/api/dashboard/team/")
        self.assertEqual(response.status_code, 403)

    def test_team_dashboard_endpoint_returns_ranking(self):
        """El endpoint /api/dashboard/team/ devuelve el resumen global
        + ranking por vendedor con las 4 métricas."""
        CashEntry.objects.create(
            document=self.document_a,
            kind=CashEntry.Kind.ANTICIPO,
            amount=Decimal("250.00"),
        )
        self.document_a.state = Document.State.RECIBO_ANTICIPO
        self.document_a.save(update_fields=["state"])

        self.client.force_authenticate(self.supervisor)
        response = self.client.get("/api/dashboard/team/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["proformas_emitidas"], 2)
        self.assertEqual(response.data["anticipos_en_curso"], 1)
        self.assertEqual(response.data["ventas_cerradas"], 0)
        self.assertEqual(response.data["conversion_proforma"], "50.00")
        self.assertEqual(response.data["vendedores_activos"], 2)
        self.assertEqual(len(response.data["ranking"]), 2)

        # Cada fila del ranking debe tener las 4 métricas requeridas.
        for row in response.data["ranking"]:
            self.assertIn("proformas_emitidas", row)
            self.assertIn("anticipos_en_curso", row)
            self.assertIn("ventas_cerradas", row)
            self.assertIn("conversion_proforma", row)
            self.assertIn("vendedor_id", row)
            self.assertIn("vendedor_name", row)


class SalesMetricsServiceTests(TestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            username="seller", email="seller@test.local", role=User.Role.VENDEDOR
        )

    def _document(self, code):
        return Document.objects.create(
            code=code,
            vendedor=self.seller,
            cliente="Cliente",
            fecha="2026-08-01",
        )

    def test_conversion_uses_all_issued_documents_and_active_advances(self):
        converted = self._document("DOC-1")
        revoked = self._document("DOC-2")
        self._document("DOC-3")
        CashEntry.objects.create(
            document=converted, kind=CashEntry.Kind.ANTICIPO, amount=Decimal("300")
        )
        CashEntry.objects.create(
            document=revoked,
            kind=CashEntry.Kind.ANTICIPO,
            amount=Decimal("100"),
            is_revoked=True,
        )

        result = SalesMetricsService().advance_conversion()

        self.assertEqual(result.proformas_emitidas, 3)
        self.assertEqual(result.recibos_anticipo, 1)
        self.assertEqual(result.total_ventas_anticipo, Decimal("300"))
        self.assertEqual(result.conversion_proforma, Decimal("33.33"))

    def test_conversion_is_zero_when_there_are_no_proformas(self):
        result = SalesMetricsService().advance_conversion()
        self.assertEqual(result.conversion_proforma, Decimal("0.00"))

    def test_seller_summary_returns_four_required_kpis(self):
        """seller_summary debe devolver las 4 métricas requeridas."""
        # 3 proformas: 1 en anticipo, 1 cerrada, 1 en proforma pura.
        doc_proforma = self._document("P-1")
        doc_anticipo = self._document("A-1")
        doc_cerrada = self._document("C-1")
        doc_anticipo.state = Document.State.RECIBO_ANTICIPO
        doc_anticipo.save(update_fields=["state"])
        doc_cerrada.state = Document.State.CERRADO
        doc_cerrada.save(update_fields=["state"])
        CashEntry.objects.create(
            document=doc_anticipo,
            kind=CashEntry.Kind.ANTICIPO,
            amount=Decimal("150"),
        )
        CashEntry.objects.create(
            document=doc_cerrada,
            kind=CashEntry.Kind.LIQUIDACION,
            amount=Decimal("300"),
        )

        result = SalesMetricsService().seller_summary(self.seller)

        self.assertEqual(result.proformas_emitidas, 3)
        self.assertEqual(result.anticipos_en_curso, 1)
        self.assertEqual(result.ventas_cerradas, 1)
        # 1 de 3 proformas llegó a anticipo → 33.33%.
        self.assertEqual(result.conversion_proforma, Decimal("33.33"))
        self.assertEqual(result.total_ventas_anticipo, Decimal("150"))
        self.assertEqual(result.caja_cobrada, Decimal("450"))
        self.assertEqual(result.vendedor_id, self.seller.id)

    def test_team_summary_aggregates_per_seller_metrics(self):
        """team_summary agrega las métricas de cada vendedor activo."""
        seller_b = User.objects.create_user(
            username="seller-b", email="b@test.local", role=User.Role.VENDEDOR
        )
        # seller: 1 proforma emitida, 1 anticipo.
        doc_a = self._document("A-1")
        doc_a.state = Document.State.RECIBO_ANTICIPO
        doc_a.save(update_fields=["state"])
        CashEntry.objects.create(
            document=doc_a, kind=CashEntry.Kind.ANTICIPO, amount=Decimal("200")
        )
        # seller_b: 2 proformas emitidas, 1 cerrada.
        doc_b1 = Document.objects.create(
            code="B-1", vendedor=seller_b, cliente="C", fecha="2026-08-01"
        )
        Document.objects.create(
            code="B-2", vendedor=seller_b, cliente="C", fecha="2026-08-01"
        )
        doc_b1.state = Document.State.CERRADO
        doc_b1.save(update_fields=["state"])

        result = SalesMetricsService().team_summary()

        # Totales del equipo.
        self.assertEqual(result.proformas_emitidas, 3)  # 1 (seller) + 2 (seller_b)
        self.assertEqual(result.anticipos_en_curso, 1)
        self.assertEqual(result.ventas_cerradas, 1)
        self.assertEqual(result.recibos_anticipo, 1)
        self.assertEqual(result.total_ventas_anticipo, Decimal("200"))
        # 1 de 3 proformas llegó a anticipo → 33.33%.
        self.assertEqual(result.conversion_proforma, Decimal("33.33"))

        # Ranking con 2 vendedores activos.
        self.assertEqual(len(result.vendedores), 2)
