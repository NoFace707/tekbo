/**
 * salesService.js
 *
 * Single Responsibility: acceso HTTP al módulo de ventas del backend
 * (DRF /api/sales/).
 *
 * No conoce UI ni estado. Depende de la abstracción apiClient (DIP).
 *
 * Endpoints expuestos:
 *  - GET    /api/sales/                        → lista (propias o todas si admin)
 *  - POST   /api/sales/                        → crear documento
 *  - GET    /api/sales/<id>/                   → detalle
 *  - PATCH  /api/sales/<id>/                   → actualizar (solo si PROFORMA)
 *  - DELETE /api/sales/<id>/                   → eliminar
 *  - GET    /api/sales/<id>/available_transitions/
 *  - POST   /api/sales/<id>/transition/        → aplicar transición
 *  - GET    /api/sales/<id>/stock_status/      → estado de stock por ítem
 */

import { requestJsonWithAuthRetry } from "./apiClient";

/**
 * Lista documentos propios o todos para administrador/supervisor.
 * @param {{state?:string, search?:string}} params
 */
export async function listDocuments(params = {}) {
  const qs = new URLSearchParams();
  if (params.state) qs.set("state", params.state);
  if (params.search) qs.set("search", params.search);
  if (params.vendedor) qs.set("vendedor", params.vendedor);
  const s = qs.toString();
  const url = `/api/sales/${s ? `?${s}` : ""}`;
  const data = await requestJsonWithAuthRetry(url, { method: "GET" });
  return Array.isArray(data) ? data : data?.results || [];
}

/**
 * Obtiene un documento por id (incluye ítems, reservas, caja, totales).
 */
export async function getDocument(id) {
  return requestJsonWithAuthRetry(`/api/sales/${id}/`, { method: "GET" });
}

/**
 * Crea un documento (proforma inicialmente).
 * @param {object} payload { cliente, fecha, direccion?, celular?, descuento?, kind?, items?:[{product?, desc, qty, price}] }
 */
export async function createDocument(payload) {
  return requestJsonWithAuthRetry("/api/sales/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Actualiza un documento (solo si está en PROFORMA).
 */
export async function updateDocument(id, payload) {
  return requestJsonWithAuthRetry(`/api/sales/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Elimina un documento.
 */
export async function deleteDocument(id) {
  return requestJsonWithAuthRetry(`/api/sales/${id}/`, {
    method: "DELETE",
  });
}

/**
 * Lista las transiciones disponibles para el documento.
 * @returns {Promise<Array<{key:string,label:string,needs_amount:boolean}>>}
 */
export async function fetchAvailableTransitions(id) {
  const data = await requestJsonWithAuthRetry(
    `/api/sales/${id}/available_transitions/`,
    { method: "GET" }
  );
  return data?.transitions || [];
}

/**
 * Aplica una transición de estado.
 * @param {number|string} id
 * @param {{transition:string, amount?:number|string, note?:string}} payload
 */
export async function applyTransition(id, payload) {
  return requestJsonWithAuthRetry(`/api/sales/${id}/transition/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Devuelve el estado de stock por ítem del documento.
 * @returns {Promise<{items: Array}>}
 */
export async function fetchStockStatus(id) {
  return requestJsonWithAuthRetry(`/api/sales/${id}/stock_status/`, {
    method: "GET",
  });
}
