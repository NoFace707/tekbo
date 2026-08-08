/**
 * DocumentListPanel.jsx
 *
 * Single Responsibility: panel lateral con la lista de documentos del
 * vendedor cargados desde el backend. Permite abrir uno para editarlo
 * o continuar el flujo, y borrarlo si ya no se necesita.
 *
 * No conoce la FSM: solo dispara onSelect(documentId) y
 * onDelete(documentId).
 */

import { useMemo, useState } from "react";
import {
  DOCUMENT_STATE_LABEL,
  STATE_COLOR,
} from "../../services/tekbo";

function fmtBs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Bs`;
}

export default function DocumentListPanel({
  documents,
  loading,
  activeId,
  onSelect,
  onRefresh,
  onDelete,
}) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (stateFilter && d.state !== stateFilter) return false;
      if (!q) return true;
      return (
        (d.code || "").toLowerCase().includes(q) ||
        (d.cliente || "").toLowerCase().includes(q)
      );
    });
  }, [documents, search, stateFilter]);

  const handleDelete = (e, doc) => {
    e.stopPropagation();
    if (onDelete) onDelete(doc.id, doc.code);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-brand-800">
          📋 Mis documentos
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
          title="Recargar"
        >
          ↻
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código o cliente..."
          className="h-9 flex-1 rounded-md border border-slate-300 bg-white px-3 text-xs outline-none focus:border-brand-800"
        />
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs outline-none focus:border-brand-800"
        >
          <option value="">Todos</option>
          {Object.entries(DOCUMENT_STATE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-[420px] overflow-y-auto rounded-md border border-slate-100 bg-white">
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-slate-400">
            No hay documentos. Crea una proforma para empezar.
          </div>
        ) : (
          filtered.map((d) => {
            const color = STATE_COLOR[d.state] || STATE_COLOR.proforma;
            const isActive = activeId === d.id;
            return (
              <div
                key={d.id}
                className={[
                  "group flex w-full items-center justify-between border-b border-slate-100 px-3 py-2.5 transition last:border-b-0",
                  isActive ? "bg-brand-50" : "hover:bg-slate-50",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => onSelect(d.id)}
                  className="flex min-w-0 flex-1 items-center justify-between text-left"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {d.cliente || "—"}
                    </p>
                    <p className="font-mono text-[10px] text-slate-500">
                      {d.code} · {d.fecha}
                    </p>
                  </div>
                  <div className="ml-2 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border ${color.border} ${color.bg} px-2 py-0.5 text-[10px] font-bold ${color.text}`}
                    >
                      <span className={`h-1 w-1 rounded-full ${color.dot}`} />
                      {DOCUMENT_STATE_LABEL[d.state] || d.state}
                    </span>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-600">
                      {fmtBs(d.total)}
                    </p>
                  </div>
                </button>
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, d)}
                    title="Borrar documento"
                    className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4"
                    >
                      <path
                        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
