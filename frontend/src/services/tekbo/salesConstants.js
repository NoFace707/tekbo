/**
 * salesConstants.js
 *
 * Constantes de dominio del módulo de ventas Tekbo.
 * Single Responsibility: definición de valores invariantes.
 *
 * Open/Closed: agregar un nuevo estado o transición se hace aquí sin
 * tocar componentes ni servicios.
 */

// Estados del documento (deben coincidir con backend sales.models.Document.State).
export const DOCUMENT_STATE = {
  PROFORMA: "proforma",
  RECIBO_ANTICIPO: "recibo_anticipo",
  RECIBO_FINAL: "recibo_final",
  CERRADO: "cerrado",
};

// Etiquetas legibles en español.
export const DOCUMENT_STATE_LABEL = {
  [DOCUMENT_STATE.PROFORMA]: "Proforma",
  [DOCUMENT_STATE.RECIBO_ANTICIPO]: "Recibo de Anticipo",
  [DOCUMENT_STATE.RECIBO_FINAL]: "Recibo Final / Entrega",
  [DOCUMENT_STATE.CERRADO]: "Cerrado",
};

// Claves de transición (deben coincidir con TRANSITIONS del backend).
export const TRANSITION_KEY = {
  PAY_ADVANCE: "pay_advance",
  PAY_TOTAL: "pay_total",
  REVERT_TO_PROFORMA: "revert_to_proforma",
  SETTLE_FINAL: "settle_final",
  CLOSE: "close",
};

// Etiquetas legibles de transición.
export const TRANSITION_LABEL = {
  [TRANSITION_KEY.PAY_ADVANCE]: "Registrar anticipo (30% / 70%)",
  [TRANSITION_KEY.PAY_TOTAL]: "Pago total directo (100%)",
  [TRANSITION_KEY.REVERT_TO_PROFORMA]: "Revertir a proforma",
  [TRANSITION_KEY.SETTLE_FINAL]: "Liquidar saldo pendiente",
  [TRANSITION_KEY.CLOSE]: "Cerrar documento",
};

// Mapa estado → color Tailwind (consistentes con la paleta del proyecto).
export const STATE_COLOR = {
  [DOCUMENT_STATE.PROFORMA]: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-800",
    dot: "bg-sky-500",
  },
  [DOCUMENT_STATE.RECIBO_ANTICIPO]: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  [DOCUMENT_STATE.RECIBO_FINAL]: {
    bg: "bg-lime-100",
    border: "border-lime-300",
    text: "text-lime-900",
    dot: "bg-lime-700",
  },
  [DOCUMENT_STATE.CERRADO]: {
    bg: "bg-brand-50",
    border: "border-brand-200",
    text: "text-brand-800",
    dot: "bg-brand-800",
  },
};

// Indica si el documento está "bloqueado" para edición de ítems.
export function isLockedForEdit(state) {
  return (
    state === DOCUMENT_STATE.RECIBO_FINAL ||
    state === DOCUMENT_STATE.CERRADO
  );
}

// Indica si el documento es terminal.
export function isTerminal(state) {
  return state === DOCUMENT_STATE.CERRADO;
}
