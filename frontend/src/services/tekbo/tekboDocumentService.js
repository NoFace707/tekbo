/**
 * tekboDocumentService.js
 *
 * Single Responsibility: cálculo y validación del documento (recibo/proforma).
 * Recibe datos crudos y devuelve totales / estado derivado. No toca UI ni storage.
 *
 * Funciones puras => fáciles de testear y reutilizables (Open/Closed).
 */

import { DOCUMENT_TYPE, MAX_ITEM_ROWS } from "./tekboConstants";
import { toNumberSafe } from "./tekboFormatterService";

/**
 * Crea un ítem vacío.
 */
export function createEmptyItem() {
  return { desc: "", qty: 1, price: 0 };
}

/**
 * Crea un ítem a partir de un producto del catálogo.
 *
 * Open/Closed: este adaptador permite que el documento Tekbo trabaje con
 * productos sin acoplarse a la forma del producto del backend. Si el
 * producto cambia de campos, solo se cambia este adaptador.
 *
 * @param {{id?:number, nombre?:string, detalle?:string, costo?:number|string}} product
 * @param {number} qty
 * @returns {{desc:string, qty:number, price:number, productId?:number}}
 */
export function createItemFromProduct(product, qty = 1) {
  const item = {
    desc: product?.nombre || "Producto",
    qty: Math.max(1, toNumberSafe(qty, 1)),
    price: Math.max(0, toNumberSafe(product?.costo, 0)),
  };
  // Guardamos el id del producto para uso futuro (p. ej. descontar stock).
  // Es opcional para no romper ítems manuales ya guardados.
  if (product?.id != null) item.productId = product.id;
  return item;
}

/**
 * Agrega un ítem o suma su cantidad si el producto ya está en el documento.
 * La identidad se basa en productId para ítems del catálogo y en descripción
 * + precio para ítems manuales.
 */
export function addOrMergeItem(items, incoming, maxRows = MAX_ITEM_ROWS) {
  const current = Array.isArray(items) ? items : [];
  const sameProduct = (item) => {
    if (incoming?.productId != null) return item.productId === incoming.productId;
    return (
      item.productId == null &&
      String(item.desc || "").trim().toLowerCase() === String(incoming?.desc || "").trim().toLowerCase() &&
      Number(item.price) === Number(incoming?.price)
    );
  };
  const index = current.findIndex(sameProduct);
  if (index >= 0) {
    return current.map((item, itemIndex) =>
      itemIndex === index
        ? { ...item, qty: Math.max(0, Number(item.qty) || 0) + Math.max(0, Number(incoming.qty) || 0) }
        : item
    );
  }
  if (current.length >= maxRows) return null;
  return [...current, incoming];
}

/**
 * Crea un documento vacío (estado inicial del panel).
 */
export function createEmptyDocument() {
  return {
    cliente: "",
    fecha: "",
    direccion: "",
    celular: "",
    descuento: "0",
    isProforma: false,
    items: [],
  };
}

/**
 * Calcula subtotal, descuento y total a partir del documento.
 * @param {{items?:Array, descuento?:string|number}} doc
 * @returns {{subtotal:number, descuento:number, total:number}}
 */
export function computeTotals(doc) {
  const items = Array.isArray(doc?.items) ? doc.items : [];
  const subtotal = items.reduce(
    (acc, it) => acc + toNumberSafe(it.qty) * toNumberSafe(it.price),
    0
  );
  const descuento = toNumberSafe(doc?.descuento);
  const total = Math.max(0, subtotal - descuento);
  return { subtotal, descuento, total };
}

/**
 * Indica si se pueden agregar más ítems.
 */
export function canAddItem(items) {
  return (items?.length || 0) < MAX_ITEM_ROWS;
}

/**
 * Devuelve la lista de ítems "padded" hasta MAX_ITEM_ROWS
 * para pintar filas vacías en la tabla impresa.
 */
export function padItemsForPrint(items) {
  const list = Array.isArray(items) ? items.slice(0, MAX_ITEM_ROWS) : [];
  while (list.length < MAX_ITEM_ROWS) list.push(null);
  return list;
}

/**
 * Devuelve el nombre del tipo de documento.
 * @param {boolean} isProforma
 */
export function getDocumentTypeName(isProforma) {
  return isProforma ? DOCUMENT_TYPE.PROFORMA : DOCUMENT_TYPE.RECIBO;
}

/**
 * Genera el nombre visible del archivo al guardar.
 * @param {{isProforma:boolean, fecha:string, seq:number}} params
 */
export function buildFileName({ isProforma, fecha, seq }) {
  const typeName = getDocumentTypeName(isProforma);
  return `${seq}º ${typeName} - ${fecha || ""}`;
}

/**
 * Valida que el documento tenga lo mínimo para guardarse (cliente).
 * @returns {{ok:boolean, message?:string}}
 */
export function validateForSave(doc) {
  const name = (doc?.cliente || "").trim();
  if (!name) return { ok: false, message: "Falta nombre del cliente" };
  return { ok: true };
}
