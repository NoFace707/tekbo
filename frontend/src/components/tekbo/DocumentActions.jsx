/**
 * DocumentActions.jsx
 *
 * Single Responsibility: botones de acción del documento (cambiar tipo + imprimir).
 */

import { LABELS } from "../../services/tekbo";

export default function DocumentActions({
  isProforma,
  onToggleType,
  onPrint,
  disabled = false,
}) {
  const toggleLabel = isProforma
    ? LABELS.TOGGLE_TO_RECIBO
    : LABELS.TOGGLE_TO_PROFORMA;

  return (
    <div className="mt-3 flex flex-wrap gap-2.5 border-t border-slate-200 pt-5">
      <button
        type="button"
        onClick={onToggleType}
        disabled={disabled}
        className="flex-1 rounded-lg px-4 py-4 text-sm font-black uppercase tracking-wide text-white transition disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          backgroundColor: isProforma ? "#000e51" : "#ff7b00",
        }}
      >
        {toggleLabel}
      </button>
      <button
        type="button"
        onClick={onPrint}
        className="flex-1 rounded-lg bg-tekbo-print px-4 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-emerald-600"
      >
        {LABELS.PRINT_PDF}
      </button>
    </div>
  );
}
