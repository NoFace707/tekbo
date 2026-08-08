/**
 * tekboClientService.js
 *
 * Single Responsibility: orquestación de clientes y archivos Tekbo.
 * Depende de abstracciones (storage service + document service) y no de
 * implementaciones concretas, respetando el Dependency Inversion Principle.
 *
 * Aquí vive la lógica de negocio: crear/actualizar/borrar clientes y
 * archivos, resolver el siguiente número de secuencia, etc.
 */

import {
  readDatabase,
  writeDatabase,
  readTempWork,
  writeTempWork,
} from "./tekboStorageService";
import {
  buildFileName,
  getDocumentTypeName,
} from "./tekboDocumentService";
import { nowLocaleString } from "./tekboFormatterService";

/**
 * Lista todos los clientes ordenados alfabéticamente.
 * Devuelve una copia para evitar mutaciones externas.
 */
export function listClients() {
  const db = readDatabase();
  return [...db].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

/**
 * Busca un cliente por nombre exacto.
 */
export function findClient(db, name) {
  return db.find((c) => c.name === name) || null;
}

/**
 * Busca un cliente por nombre insensible a mayúsculas.
 */
export function findClientIgnoreCase(db, name) {
  const lower = (name || "").toLowerCase();
  return db.find((c) => (c.name || "").toLowerCase() === lower) || null;
}

/**
 * Crea un cliente nuevo (sin archivos).
 * Devuelve { db, client } para que el caller pueda persistir.
 */
export function createClient(db, name) {
  const client = { name, files: [] };
  return { db: [...db, client], client };
}

/**
 * Calcula el número de secuencia para un nuevo archivo del cliente
 * considerando solo los archivos del mismo tipo (Recibo/Proforma).
 */
export function nextSequenceForClient(client, isProforma) {
  const typeName = getDocumentTypeName(isProforma);
  const sameType = (client.files || []).filter((f) => f.type === typeName);
  return sameType.length + 1;
}

/**
 * Agrega un archivo nuevo al cliente indicado.
 * Devuelve { db, client, fileIndex } listos para persistir.
 */
export function addFileToClient(db, clientName, payload) {
  let dbCopy = [...db];
  let client = findClientIgnoreCase(dbCopy, clientName);
  if (!client) {
    const created = createClient(dbCopy, clientName);
    dbCopy = created.db;
    client = created.client;
  }

  const seq = nextSequenceForClient(client, payload.isProforma);
  const fileName = buildFileName({
    isProforma: payload.isProforma,
    fecha: payload.data.fecha,
    seq,
  });

  const file = {
    name: fileName,
    type: getDocumentTypeName(payload.isProforma),
    dateSaved: nowLocaleString(),
    data: payload.data,
  };

  client.files = [...(client.files || []), file];
  // Reemplazamos el cliente en dbCopy para reflejar la mutación de forma inmutable.
  dbCopy = dbCopy.map((c) => (c.name === client.name ? client : c));

  return { db: dbCopy, client, fileIndex: client.files.length - 1 };
}

/**
 * Actualiza un archivo existente.
 */
export function updateFile(db, clientName, fileIndex, data) {
  const dbCopy = [...db];
  const clientIdx = dbCopy.findIndex((c) => c.name === clientName);
  if (clientIdx === -1) return dbCopy;
  const client = { ...dbCopy[clientIdx] };
  const files = [...(client.files || [])];
  if (!files[fileIndex]) return dbCopy;
  files[fileIndex] = {
    ...files[fileIndex],
    data,
    dateSaved: nowLocaleString(),
  };
  client.files = files;
  dbCopy[clientIdx] = client;
  return dbCopy;
}

/**
 * Elimina un cliente completo (con todos sus archivos).
 */
export function removeClient(db, clientName) {
  return db.filter((c) => c.name !== clientName);
}

/**
 * Elimina un archivo específico de un cliente.
 */
export function removeFile(db, clientName, fileIndex) {
  const dbCopy = [...db];
  const clientIdx = dbCopy.findIndex((c) => c.name === clientName);
  if (clientIdx === -1) return dbCopy;
  const client = { ...dbCopy[clientIdx] };
  const files = [...(client.files || [])];
  files.splice(fileIndex, 1);
  client.files = files;
  dbCopy[clientIdx] = client;
  return dbCopy;
}

/**
 * Devuelve los datos del último archivo guardado del cliente
 * (para pre-llenar dirección/celular al crear una hoja nueva).
 */
export function getLastFileData(client) {
  if (!client?.files?.length) return {};
  return client.files[client.files.length - 1].data || {};
}

/* ----------------------------- Persistencia ----------------------------- */

export function persistDatabase(db) {
  writeDatabase(db);
}

export function persistTempWork(data) {
  writeTempWork(data);
}

export function fetchTempWork() {
  return readTempWork();
}
