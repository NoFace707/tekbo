/**
 * tekboMagicInputService.js
 *
 * Single Responsibility: interpretar comandos en lenguaje natural del
 * "Asistente Rápido". Recibe texto y produce acciones estructuradas
 * que el componente puede aplicar al documento.
 *
 * No muta estado; solo calcula el siguiente patch (funciones puras).
 *
 * Sintaxis soportada (igual que el HTML original):
 *   - "Cliente Ana"            -> { field: "cliente", value: "Ana" }
 *   - "Celular 77712345"       -> { field: "celular", value: "77712345" }
 *   - "2 Pantallas a 500"      -> { addItem: {qty:2, desc:"Pantallas", price:500} }
 *   - cualquier otra cosa      -> null
 */

import { capitalizeFirst } from "./tekboFormatterService";
import { createEmptyItem } from "./tekboDocumentService";

const RE_QTY_DESC_PRICE = /(\d+)\s+(.+)\s+a\s+(\d+(?:[.,]\d+)?)/;

/**
 * Parsea el texto del Asistente Rápido.
 *
 * @param {string} raw Texto ingresado por el usuario.
 * @param {object} ctx { currentItems: Array } contexto actual del documento.
 * @returns {null | {
 *   kind: "set-field" | "add-item",
 *   field?: "cliente" | "celular",
 *   value?: string,
 *   item?: {qty:number, desc:string, price:number}
 * }}
 */
export function parseMagicInput(raw, ctx = {}) {
  const text = (raw || "").trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  // 1) Setear cliente.
  if (lower.startsWith("cliente")) {
    return {
      kind: "set-field",
      field: "cliente",
      value: capitalizeFirst(text.replace(/cliente/i, "")),
    };
  }

  // 2) Setear celular (solo dígitos).
  if (lower.startsWith("celular")) {
    const digits = text.replace(/\D/g, "");
    return { kind: "set-field", field: "celular", value: digits };
  }

  // 3) Agregar ítem: "<qty> <desc> a <price>".
  const match = text.match(RE_QTY_DESC_PRICE);
  if (match) {
    const item = {
      ...createEmptyItem(),
      qty: parseFloat(match[1]) || 1,
      desc: capitalizeFirst(match[2]),
      price: parseFloat(match[3].replace(",", ".")) || 0,
    };
    return { kind: "add-item", item };
  }

  return null;
}
