import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/utils";
import { getDashboard, getTeamDashboard } from "../services/dashboardService";
import { ROLE_LABEL } from "../services/authService";

const colorMap = {
  emerald: { bg: "bg-lime-100", border: "border-lime-300", text: "text-lime-900", sub: "text-lime-800", icon: "bg-lime-200 text-lime-900" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", sub: "text-amber-600", icon: "bg-amber-100 text-amber-700" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", sub: "text-rose-600", icon: "bg-rose-100 text-rose-700" },
  sky: { bg: "bg-brand-50", border: "border-brand-200", text: "text-brand-800", sub: "text-brand-700", icon: "bg-brand-100 text-brand-800" },
  violet: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", sub: "text-violet-600", icon: "bg-violet-100 text-violet-700" },
};

const iconMap = {
  users: UsersIcon,
  check: CheckIcon,
  cart: CartIcon,
  shield: ShieldIcon,
  calendar: CalendarIcon,
  phone: PhoneIcon,
};

function fmtDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function fmtBs(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Bs`;
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    getDashboard()
      .then((d) => {
        if (!mounted) return;
        setData(d);
        // Si el dashboard trae team embebido, lo usamos; si no, lo
        // cargamos aparte (solo admin/supervisor lo tienen).
        if (d?.team) setTeam(d.team);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(getErrorMessage(err, "No se pudo cargar el dashboard."));
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  // Para admin/supervisor: cargar el team dashboard por separado permite
  // refrescar la tabla de ranking sin recargar todo el dashboard.
  const refreshTeam = async () => {
    try {
      const t = await getTeamDashboard();
      setTeam(t);
    } catch (err) {
      // Silencioso: ya tenemos data del dashboard inicial.
    }
  };

  const kpis = data?.kpis || [];
  const recentUsers = data?.recent_users || [];
  const breakdown = data?.breakdown || null;
  const ranking = useMemo(() => team?.ranking || [], [team]);

  return (
    <MainLayout title={data?.title || "Dashboard"} subtitle={ROLE_LABEL[user?.role] || user?.role}>
      <section className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* CTA al Generador Tekbo para vendedores */}
        {user?.role === "vendedor" && (
          <button
            type="button"
            onClick={() => navigate("/panel")}
            className="group flex w-full flex-col items-start gap-1 rounded-2xl border border-lime-400 bg-gradient-to-r from-lime-100 via-white to-brand-50 p-5 text-left shadow-sm transition hover:border-brand-800 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-tekbo text-lg font-bold text-brand-800">
                Generador Tekbo · Recibos y Proformas
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Crea, guarda e imprime documentos para tus clientes.
              </p>
            </div>
            <span className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand-800 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition group-hover:bg-brand-600 sm:mt-0">
              Abrir generador →
            </span>
          </button>
        )}

        {/* ===================== SUPERVISOR ===================== */}
        {user?.role === "supervisor" && (
          <>
            {/* Sección GENERAL: 4 KPIs requeridos + 2 de contexto */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-800">
                    General · Equipo de ventas
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Métricas agregadas de todos los vendedores activos
                  </p>
                </div>
                <button
                  onClick={refreshTeam}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  title="Refrescar métricas del equipo"
                >
                  ↻ Actualizar
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="h-4 w-24 rounded bg-slate-200" />
                        <div className="mt-3 h-8 w-32 rounded bg-slate-200" />
                        <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
                      </div>
                    ))
                  : kpis.map((kpi) => {
                      const colors = colorMap[kpi.color] || colorMap.emerald;
                      const Icon = iconMap[kpi.icon] || UsersIcon;
                      return (
                        <article
                          key={kpi.label}
                          className={`rounded-2xl border ${colors.border} ${colors.bg} p-5 transition-shadow hover:shadow-md`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                              {kpi.label}
                            </p>
                            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors.icon}`}>
                              <Icon className="h-5 w-5" />
                            </span>
                          </div>
                          <p className={`mt-3 text-3xl font-black ${colors.text}`}>{kpi.value}</p>
                          {kpi.sub ? (
                            <p className={`mt-1 text-xs font-medium ${colors.sub}`}>{kpi.sub}</p>
                          ) : null}
                        </article>
                      );
                    })}
              </div>
            </div>

            {/* Sección POR VENDEDOR: tabla ranking con las 4 métricas */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-slate-800">
                    Por vendedor
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Desglose individual de las métricas de cada vendedor activo
                  </p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
                  {ranking.length} vendedores
                </span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                  ))}
                </div>
              ) : ranking.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-slate-400">
                  <UsersIcon className="mb-2 h-8 w-8" />
                  <p className="text-xs">No hay vendedores activos para mostrar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="py-3 pr-4">Vendedor</th>
                        <th className="py-3 pr-4 text-right">Proformas emitidas</th>
                        <th className="py-3 pr-4 text-right">Anticipos en curso</th>
                        <th className="py-3 pr-4 text-right">Ventas cerradas</th>
                        <th className="py-3 pr-4 text-right">Conversión de proforma</th>
                        <th className="py-3 pr-4 text-right">Caja cobrada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((row) => (
                        <tr
                          key={row.vendedor_id}
                          className="border-b border-slate-50 transition-colors hover:bg-slate-50/60"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-xs font-bold text-white">
                                {(row.vendedor_name || "?")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {row.vendedor_name}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  ID: {row.vendedor_id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span className="font-bold text-brand-800">
                              {row.proformas_emitidas}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span
                              className={[
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                                row.anticipos_en_curso > 0
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-500",
                              ].join(" ")}
                            >
                              {row.anticipos_en_curso}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span
                              className={[
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                                row.ventas_cerradas > 0
                                  ? "bg-lime-100 text-lime-900"
                                  : "bg-slate-100 text-slate-500",
                              ].join(" ")}
                            >
                              {row.ventas_cerradas}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span className="font-mono text-slate-700">
                              {row.conversion_proforma}%
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right">
                            <span className="font-mono font-semibold text-slate-700">
                              {fmtBs(row.caja_cobrada)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {ranking.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-600">
                          <td className="py-3 pr-4">Total equipo</td>
                          <td className="py-3 pr-4 text-right">
                            {ranking.reduce(
                              (a, r) => a + (r.proformas_emitidas || 0),
                              0
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {ranking.reduce(
                              (a, r) => a + (r.anticipos_en_curso || 0),
                              0
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {ranking.reduce(
                              (a, r) => a + (r.ventas_cerradas || 0),
                              0
                            )}
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {team?.conversion_proforma || "0.00"}%
                          </td>
                          <td className="py-3 pr-4 text-right">
                            {fmtBs(team?.caja_cobrada)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>

            {/* Resumen de vendedores activos/inactivos + recientes */}
            {data && breakdown && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-display text-sm font-bold text-slate-800">
                  Resumen operativo
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-lime-100 p-4">
                    <p className="text-xs uppercase tracking-wider text-lime-900">
                      Vendedores activos
                    </p>
                    <p className="mt-1 text-2xl font-black text-lime-900">
                      {breakdown.vendedores_activos ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-4">
                    <p className="text-xs uppercase tracking-wider text-rose-700">
                      Vendedores inactivos
                    </p>
                    <p className="mt-1 text-2xl font-black text-rose-800">
                      {breakdown.vendedores_inactivos ?? 0}
                    </p>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">Vendedores recientes</h4>
                  </div>
                  <RecentUsersTable users={recentUsers} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================== ADMIN ===================== */}
        {data && breakdown && user?.role === "admin" && (
          <>
            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <div className="h-4 w-24 rounded bg-slate-200" />
                      <div className="mt-3 h-8 w-32 rounded bg-slate-200" />
                      <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
                    </div>
                  ))
                : kpis.map((kpi) => {
                    const colors = colorMap[kpi.color] || colorMap.emerald;
                    const Icon = iconMap[kpi.icon] || UsersIcon;
                    return (
                      <article
                        key={kpi.label}
                        className={`rounded-2xl border ${colors.border} ${colors.bg} p-5 transition-shadow hover:shadow-md`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                            {kpi.label}
                          </p>
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors.icon}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                        </div>
                        <p className={`mt-3 text-3xl font-black ${colors.text}`}>{kpi.value}</p>
                        {kpi.sub ? (
                          <p className={`mt-1 text-xs font-medium ${colors.sub}`}>{kpi.sub}</p>
                        ) : null}
                      </article>
                    );
                  })}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-1">
                <h3 className="font-display text-sm font-bold text-slate-800">Distribucion por rol</h3>
                <div className="mt-4 space-y-3">
                  {Object.entries(breakdown.by_role || {}).map(([role, count]) => {
                    const total = Object.values(breakdown.by_role || {}).reduce(
                      (a, b) => a + b,
                      0
                    );
                    const pct = total ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={role}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-600">
                            {ROLE_LABEL[role] || role}
                          </span>
                          <span className="text-slate-500">
                            {count} · {pct}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-lime-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-slate-800">
                    Usuarios recientes
                  </h3>
                  <button
                    onClick={() => navigate("/usuarios")}
                    className="text-xs font-semibold text-brand-800 hover:text-brand-900"
                  >
                    Ver todos →
                  </button>
                </div>
                <RecentUsersTable users={recentUsers} />
              </div>
            </div>
          </>
        )}

        {/* ===================== VENDEDOR ===================== */}
        {data && user?.role === "vendedor" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <div className="h-4 w-24 rounded bg-slate-200" />
                      <div className="mt-3 h-8 w-32 rounded bg-slate-200" />
                      <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
                    </div>
                  ))
                : kpis.map((kpi) => {
                    const colors = colorMap[kpi.color] || colorMap.emerald;
                    const Icon = iconMap[kpi.icon] || UsersIcon;
                    return (
                      <article
                        key={kpi.label}
                        className={`rounded-2xl border ${colors.border} ${colors.bg} p-5 transition-shadow hover:shadow-md`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                            {kpi.label}
                          </p>
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors.icon}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                        </div>
                        <p className={`mt-3 text-3xl font-black ${colors.text}`}>{kpi.value}</p>
                        {kpi.sub ? (
                          <p className={`mt-1 text-xs font-medium ${colors.sub}`}>{kpi.sub}</p>
                        ) : null}
                      </article>
                    );
                  })}
            </div>

            {data.user && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-display text-sm font-bold text-slate-800">Mi perfil</h3>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Usuario" value={data.user.username} />
                  <Field label="Nombre" value={data.user.full_name} />
                  <Field label="Correo" value={data.user.email || "—"} />
                  <Field label="Telefono" value={data.user.phone || "—"} />
                  <Field label="Fecha de ingreso" value={fmtDate(data.user.date_joined)} />
                  <Field label="Rol" value={ROLE_LABEL[user.role]} />
                </dl>
              </div>
            )}
          </>
        )}
      </section>
    </MainLayout>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function RecentUsersTable({ users }) {
  if (!users || users.length === 0) {
    return (
      <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-8 text-slate-400">
        <UsersIcon className="mb-2 h-8 w-8" />
        <p className="text-xs">Sin usuarios para mostrar</p>
      </div>
    );
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-4">Usuario</th>
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Rol</th>
            <th className="py-2 pr-4">Ingreso</th>
            <th className="py-2 pr-4 text-right">Estado</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-slate-50">
              <td className="py-2.5 pr-4 font-semibold text-slate-800">{u.username}</td>
              <td className="py-2.5 pr-4 text-slate-700">{u.full_name}</td>
              <td className="py-2.5 pr-4">
                <RoleBadge role={u.role} />
              </td>
              <td className="py-2.5 pr-4 text-xs text-slate-500">
                {fmtDate(u.date_joined)}
              </td>
              <td className="py-2.5 pr-4 text-right">
                <span
                  className={[
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    u.is_active
                      ? "bg-lime-100 text-lime-900"
                      : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      u.is_active ? "bg-lime-700" : "bg-slate-400",
                    ].join(" ")}
                  />
                  {u.is_active ? "Activo" : "Inactivo"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    admin: "bg-brand-100 text-brand-800",
    supervisor: "bg-violet-100 text-violet-700",
    vendedor: "bg-lime-200 text-lime-900",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[role] || "bg-slate-100 text-slate-600"}`}
    >
      {ROLE_LABEL[role] || role}
    </span>
  );
}

/* Icons */
function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="7" r="3" />
      <path d="M21 20v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h3l2.4 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H5.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShieldIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3l7 4v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CalendarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
function PhoneIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
