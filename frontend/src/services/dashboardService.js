import { requestJsonWithAuthRetry } from "./apiClient";

/**
 * Dashboard del rol del usuario autenticado.
 *  - admin:      totales globales.
 *  - supervisor: KPIs generales del equipo + ranking por vendedor (team).
 *  - vendedor:   métricas personales.
 */
export async function getDashboard() {
  return requestJsonWithAuthRetry("/api/dashboard/", { method: "GET" });
}

/**
 * Resumen del equipo de ventas (solo admin/supervisor).
 * Devuelve los agregados globales + ranking por vendedor con las 4
 * métricas (proformas_emitidas, anticipos_en_curso, ventas_cerradas,
 * conversion_proforma).
 *
 * Útil para refrescar solo la sección "Por vendedor" del dashboard del
 * supervisor sin recargar todo el dashboard.
 */
export async function getTeamDashboard() {
  return requestJsonWithAuthRetry("/api/dashboard/team/", { method: "GET" });
}
