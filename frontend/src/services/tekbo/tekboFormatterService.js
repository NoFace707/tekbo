/**
 * tekboFormatterService.js
 *
 * Single Responsibility: formateo de valores (moneda, fecha, capitalización).
 * No conoce detalles de almacenamiento ni de UI.
 *
 * Interface Segregation: expone solo funciones puras de formato.
 */

import { CURRENCY_SUFFIX, LOCALE } from "./tekboConstants";

/**
 * Formatea un número como moneda boliviana (Bs).
 * @param {number|string|undefined|null} value
 * @returns {string} "1.234,56 Bs" o "0,00 Bs"
 */
export function formatCurrency(value) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return (
    safe.toLocaleString(LOCALE, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " " + CURRENCY_SUFFIX
  );
}

/**
 * Convierte cualquier string en entero/float seguro.
 * @param {string|number} raw
 * @param {number} fallback
 */
export function toNumberSafe(raw, fallback = 0) {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Devuelve la fecha de hoy en formato DD/MM/AAAA (es-BO).
 */
export function todayLocale() {
  return new Date().toLocaleDateString(LOCALE);
}

/**
 * Devuelve timestamp local legible para auditoría (dateSaved).
 */
export function nowLocaleString() {
  return new Date().toLocaleString(LOCALE);
}

/**
 * Capitaliza la primera letra del texto y recorta espacios.
 * Usado por el Asistente Rápido (magic input).
 */
export function capitalizeFirst(text) {
  const t = String(text).trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}
