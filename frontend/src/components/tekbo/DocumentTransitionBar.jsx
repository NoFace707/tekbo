/**
 * DocumentTransitionBar.jsx
 *
 * Single Responsibility: barra de acciones de transición de estado.
 *
 * Recibe la lista de transiciones disponibles (del backend) y un
 * callback onApply(transitionKey, {amount?, note?}). Si la transición
 * requiere monto, pide al usuario que lo ingrese antes de disparar.
 *
 * No conoce la FSM: solo reacciona a lo que el backend dice que es
 * posible (Dependency Inversion).
 */

import { useState } from "react";

export default function DocumentTransitionBar({
  transitions,
  onApply,
  disabled,
  paidTotal,
  balanceDue,
}) {
  const [pendingTransition, setPendingTransition] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total =
    (typeof paidTotal === "number" ? paidTotal : 0) +
    (typeof balanceDue === "number" ? balanceDue : 0);

  if (!transitions || transitions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
        No hay transiciones disponibles para este documento.
      </div>
    );
  }

  const handleClick = (t) => {
    if (t.needs_amount) {
      // Sugerencia editable según el tipo de cobro:
      // anticipo 30%, pago total 100% y liquidación el saldo pendiente.
      const defaultAmount =
        t.key === "pay_advance"
          ? total * 0.3
          : t.key === "pay_total"
          ? total
          : balanceDue;
      setAmount(defaultAmount > 0 ? defaultAmount.toFixed(2) : "");
      setNote("");
      setPendingTransition(t);
    } else {
      // Sin monto: confirmar directo.
      if (
        window.confirm(`¿Confirmar: ${t.label}?`)
      ) {
        setSubmitting(true);
        Promise.resolve(onApply(t.key, {}))
          .finally(() => setSubmitting(false));
      }
    }
  };

  const handleConfirmAmount = async () => {
    if (!pendingTransition) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      window.alert("Ingresa un monto válido mayor a 0.");
      return;
    }
    setSubmitting(true);
    try {
      await onApply(pendingTransition.key, { amount: n, note });
      setPendingTransition(null);
      setAmount("");
      setNote("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAmount = () => {
    setPendingTransition(null);
    setAmount("");
    setNote("");
  };

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-brand-800">
          ⚙️ Acciones del documento
        </p>
        {typeof paidTotal === "number" && typeof balanceDue === "number" && (
          <div className="flex flex-wrap gap-3 text-[11px]">
            <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-slate-700">
              Pagado: {paidTotal.toFixed(2)} Bs
            </span>
            <span
              className={[
                "rounded-full px-2 py-0.5 font-semibold",
                balanceDue > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-lime-100 text-lime-900",
              ].join(" ")}
            >
              Saldo: {balanceDue.toFixed(2)} Bs
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => {
          // Color según la transición.
          const isRevert = t.key === "revert_to_proforma";
          const isClose = t.key === "close";
          const isFinal = t.key === "pay_total" || t.key === "settle_final";
          const isAdvance = t.key === "pay_advance";

          const cls = isRevert
            ? "bg-rose-600 hover:bg-rose-700"
            : isClose
            ? "bg-brand-800 hover:bg-brand-600"
            : isFinal
            ? "bg-lime-700 hover:bg-lime-800"
            : isAdvance
            ? "bg-amber-500 hover:bg-amber-600"
            : "bg-slate-600 hover:bg-slate-700";

          return (
            <button
              key={t.key}
              type="button"
              disabled={disabled || submitting}
              onClick={() => handleClick(t)}
              className={`rounded-lg px-3 py-2 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
            >
              {t.label}
              {t.needs_amount && (
                <span className="ml-1 text-[10px] opacity-80">💰</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Modal inline para capturar monto */}
      {pendingTransition && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="mb-2 text-xs font-bold text-amber-900">
            {pendingTransition.label}
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setAmount("");
                  return;
                }
                const value = Number(raw);
                setAmount(Number.isFinite(value) ? String(Math.max(0, value)) : "");
              }}
              placeholder="Monto en Bs"
              autoFocus
              className="h-10 w-40 rounded-md border border-amber-300 bg-white px-3 text-sm outline-none focus:border-brand-800"
            />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota (opcional)"
              className="h-10 flex-1 rounded-md border border-amber-300 bg-white px-3 text-sm outline-none focus:border-brand-800"
            />
            <button
              type="button"
              onClick={handleConfirmAmount}
              disabled={submitting}
              className="rounded-md bg-lime-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-lime-800 disabled:opacity-50"
            >
              {submitting ? "Procesando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={handleCancelAmount}
              disabled={submitting}
              className="rounded-md bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
