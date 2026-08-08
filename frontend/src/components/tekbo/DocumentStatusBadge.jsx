/**
 * DocumentStatusBadge.jsx
 *
 * Single Responsibility: mostrar el estado actual del documento como
 * un badge de color. Componente puramente presentacional.
 */

import {
  DOCUMENT_STATE_LABEL,
  STATE_COLOR,
} from "../../services/tekbo";

export default function DocumentStatusBadge({ state, code }) {
  const color = STATE_COLOR[state] || STATE_COLOR.proforma;
  const label = DOCUMENT_STATE_LABEL[state] || state || "—";

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border ${color.border} ${color.bg} px-3 py-1.5 text-xs font-bold ${color.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
      {label}
      {code && (
        <span className="ml-1 font-mono text-[10px] opacity-70">#{code}</span>
      )}
    </div>
  );
}
