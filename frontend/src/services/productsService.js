/**
 * productsService.js
 *
 * Single Responsibility: acceso HTTP al catálogo de productos del backend
 * (DRF /api/products/).
 *
 * No conoce UI ni estado. Solo expone funciones async que devuelven JSON.
 * Depende de la abstracción apiClient (requestJsonWithAuthRetry),
 * respetando el Dependency Inversion Principle.
 *
 * Permite que un mock pueda sustituir a la implementación HTTP real
 * sin tocar a los consumidores (Liskov Substitution).
 */

import { requestJsonWithAuthRetry } from "./apiClient";

/**
 * Lista productos con filtros opcionales.
 *
 * @param {{search?:string, in_stock?:boolean, ordering?:string}} params
 * @returns {Promise<Array<object>>}
 */
export async function listProducts(params = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.in_stock === true) qs.set("in_stock", "true");
  if (params.in_stock === false) qs.set("in_stock", "false");
  if (params.ordering) qs.set("ordering", params.ordering);
  const s = qs.toString();
  const url = `/api/products/${s ? `?${s}` : ""}`;
  const data = await requestJsonWithAuthRetry(url, { method: "GET" });
  return Array.isArray(data) ? data : data?.results || [];
}

/**
 * Obtiene un producto por id.
 */
export async function getProduct(id) {
  return requestJsonWithAuthRetry(`/api/products/${id}/`, { method: "GET" });
}

/**
 * Crea un producto (solo admin).
 * @param {{nombre:string, detalle?:string, stock?:number, costo?:number|string}} payload
 */
export async function createProduct(payload) {
  return requestJsonWithAuthRetry("/api/products/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Actualiza un producto (solo admin). PATCH parcial.
 */
export async function updateProduct(id, payload) {
  return requestJsonWithAuthRetry(`/api/products/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/**
 * Elimina un producto (solo admin).
 */
export async function deleteProduct(id) {
  // DELETE 204 → sin body; apiClient maneja el caso.
  return requestJsonWithAuthRetry(`/api/products/${id}/`, {
    method: "DELETE",
  });
}
