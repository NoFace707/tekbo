/**
 * tekboDocumentAdapter.js
 *
 * Single Responsibility: convertir entre el formato de documento que usa
 * el frontend (heredado del HTML V17: {cliente, fecha, direccion, celular,
 * descuento, isProforma, items:[{desc,qty,price,productId?}]}) y el
 * formato que entiende el backend sales API.
 *
 * Open/Closed: si el backend cambia de schema, solo se edita este
 * adaptador; los componentes y hooks no se enteran.
 */

import { DOCUMENT_STATE } from "./salesConstants";

/**
 * Convierte un documento del frontend (formato Tekbo V17) al payload
 * que espera el endpoint POST/PATCH /api/sales/.
 *
 * @param {object} doc
 * @param {boolean} isProforma
 * @returns {object} payload para el backend
 */
export function toBackendPayload(doc, isProforma) {
  return {
    cliente: doc.cliente || "",
    fecha: doc.fecha || "",
    direccion: doc.direccion || "",
    celular: doc.celular || "",
    descuento: Number(doc.descuento) || 0,
    kind: isProforma ? "proforma" : "recibo",
    items: (doc.items || []).map((it) => ({
      product: it.productId ?? null,
      desc: it.desc || "",
      qty: Number(it.qty) || 0,
      price: Number(it.price) || 0,
    })),
  };
}

/**
 * Convierte un documento devuelto por el backend al formato Tekbo V17
 * que usa el panel del frontend.
 *
 * @param {object} backendDoc
 * @returns {object} doc en formato frontend + metadata extra
 */
export function fromBackendDocument(backendDoc) {
  return {
    // Campos del formato V17 (compatibles con el hook useTekboState).
    cliente: backendDoc.cliente || "",
    fecha: backendDoc.fecha || "",
    direccion: backendDoc.direccion || "",
    celular: backendDoc.celular || "",
    descuento: String(backendDoc.descuento ?? "0"),
    isProforma: backendDoc.state === DOCUMENT_STATE.PROFORMA,
    items: (backendDoc.items || []).map((it) => ({
      desc: it.desc || "",
      qty: Number(it.qty) || 0,
      price: Number(it.price) || 0,
      productId: it.product ?? undefined,
    })),
    // Metadata adicional proveniente del backend.
    _backend: {
      id: backendDoc.id,
      code: backendDoc.code,
      state: backendDoc.state,
      state_display: backendDoc.state_display,
      kind: backendDoc.kind,
      vendedor: backendDoc.vendedor,
      vendedor_name: backendDoc.vendedor_name,
      subtotal: Number(backendDoc.subtotal) || 0,
      total: Number(backendDoc.total) || 0,
      paid_total: Number(backendDoc.paid_total) || 0,
      balance_due: Number(backendDoc.balance_due) || 0,
      cash_entries: backendDoc.cash_entries || [],
      reservations: backendDoc.reservations || [],
      created_at: backendDoc.created_at,
      updated_at: backendDoc.updated_at,
    },
  };
}
