/**
 * tekboStorageService.js
 *
 * Single Responsibility: persistencia en localStorage.
 * Es la única capa que sabe CÓMO se guarda/lee; los demás servicios
 * consumen esta interfaz (Dependency Inversion).
 *
 * No valida lógica de dominio (eso lo hace tekboClientService).
 * No conoce UI.
 *
 * Para testear el resto del módulo se puede inyectar un mock que
 * implemente la misma interfaz (Liskov Substitution).
 */

import { STORAGE_KEYS } from "./tekboConstants";

/**
 * Lee la "base de datos" local: array de clientes { name, files: [] }.
 * @returns {Array<{name:string, files:Array<object>}>}
 */
export function readDatabase() {
  const raw = localStorage.getItem(STORAGE_KEYS.DB);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Reemplaza toda la base de datos.
 * @param {Array} db
 */
export function writeDatabase(db) {
  localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(db ?? []));
}

/**
 * Lee el borrador temporal (trabajo en curso no guardado en un cliente).
 * @returns {object|null}
 */
export function readTempWork() {
  const raw = localStorage.getItem(STORAGE_KEYS.TEMP);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persiste el borrador temporal.
 * @param {object} data
 */
export function writeTempWork(data) {
  localStorage.setItem(STORAGE_KEYS.TEMP, JSON.stringify(data));
}

/**
 * Limpia el borrador temporal.
 */
export function clearTempWork() {
  localStorage.removeItem(STORAGE_KEYS.TEMP);
}

/**
 * Estrategia de storage inyectable.
 * Permite que otros servicios dependan de la abstracción y no de la
 * implementación concreta localStorage (DIP).
 */
export const tekboStorage = {
  readDatabase,
  writeDatabase,
  readTempWork,
  writeTempWork,
  clearTempWork,
};
