/**
 * useTekboDocuments.js
 *
 * Single Responsibility: cargar, crear, actualizar y transicionar
 * documentos Tekbo contra el backend /api/sales/.
 *
 * Depende de salesService (abstracción HTTP) — Dependency Inversion.
 * No conoce UI ni storage local.
 *
 * Los componentes del panel Tekbo consumen este hook para sincronizar
 * con el backend; el hook useTekboState sigue siendo la fuente de
 * verdad del documento en edición (borrador local), pero delega
 * guardar/transicionar a este hook cuando se confirma.
 *
 * IMPORTANTE: el valor de retorno se memoiza con useMemo para que la
 * identidad del objeto sea estable entre renders. Esto evita loops
 * infinitos en useTekboState, donde el efecto que depende de `sales`
 * se dispararía en cada render si la referencia cambiara.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyTransition,
  createDocument,
  deleteDocument,
  fetchAvailableTransitions,
  fetchStockStatus,
  getDocument,
  listDocuments,
  updateDocument,
} from "../../services/salesService";
import {
  fromBackendDocument,
  toBackendPayload,
} from "../../services/tekbo";
import { getErrorMessage } from "../../lib/utils";

export function useTekboDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async ({ state, search } = {}) => {
    setLoading(true);
    setError("");
    try {
      const data = await listDocuments({ state, search });
      setDocuments(data);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar la lista de documentos."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getById = useCallback(async (id) => {
    const data = await getDocument(id);
    return fromBackendDocument(data);
  }, []);

  const create = useCallback(async (doc, isProforma) => {
    const payload = toBackendPayload(doc, isProforma);
    const created = await createDocument(payload);
    return fromBackendDocument(created);
  }, []);

  const update = useCallback(async (id, doc, isProforma) => {
    const payload = toBackendPayload(doc, isProforma);
    const updated = await updateDocument(id, payload);
    return fromBackendDocument(updated);
  }, []);

  const remove = useCallback(async (id) => {
    await deleteDocument(id);
  }, []);

  const getTransitions = useCallback(async (id) => {
    return fetchAvailableTransitions(id);
  }, []);

  const transition = useCallback(async (id, { transition, amount, note } = {}) => {
    const updated = await applyTransition(id, { transition, amount, note });
    return fromBackendDocument(updated);
  }, []);

  const getStockStatus = useCallback(async (id) => {
    return fetchStockStatus(id);
  }, []);

  // Memoizamos el valor de retorno: identidad estable entre renders.
  // Esto es CRÍTICO para evitar loops infinitos en useTekboState, donde
  // un useEffect depende de `sales` indirectamente.
  return useMemo(
    () => ({
      // estado
      documents,
      loading,
      error,
      // acciones
      load,
      getById,
      create,
      update,
      remove,
      getTransitions,
      transition,
      getStockStatus,
      setError,
    }),
    [
      documents,
      loading,
      error,
      load,
      getById,
      create,
      update,
      remove,
      getTransitions,
      transition,
      getStockStatus,
    ]
  );
}
