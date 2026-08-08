/**
 * useTekboState.js
 *
 * Single Responsibility: centralizar la lógica de estado del panel Tekbo
 * (documento activo, cliente/archivo activo, toolbar UI) y exponer
 * acciones puras que delegan en los servicios de dominio.
 *
 * Los componentes UI consumen este hook y no conocen detalles de
 * almacenamiento ni cálculo (Dependency Inversion).
 *
 * Integra dos fuentes de persistencia:
 *  - localStorage (tekbo_db_v17): borradores e historial local.
 *  - backend /api/sales/: documentos oficiales con estado y stock.
 *
 * El backendId (si existe) vincula el draft local con un documento del
 * backend. Las transiciones de estado se delegan a useTekboDocuments.
 *
 * NOTA ANTI-LOOP:
 *  - `sales` (de useTekboDocuments) se memoiza en ese hook para tener
 *    identidad estable entre renders.
 *  - `refreshBackendInfo` se guarda en un ref y solo se invoca cuando
 *    cambia `state.backendId`. No se incluye en las deps del effect
 *    para evitar re-disparos por cambios de identidad del callback.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addFileToClient,
  createEmptyDocument,
  createItemFromProduct,
  fetchTempWork,
  findClient,
  getLastFileData,
  listClients,
  persistDatabase,
  persistTempWork,
  readDatabase,
  removeClient,
  removeFile,
  updateFile,
  validateForSave,
  addOrMergeItem,
} from "../../services/tekbo";
import {
  AUTOSAVE_INTERVAL_MS,
  LABELS,
  todayLocale,
  fromBackendDocument,
  isLockedForEdit,
  isTerminal,
} from "../../services/tekbo";
import { useTekboDocuments } from "./useTekboDocuments";

/**
 * Estado extendido del panel: documento + identificación del archivo activo.
 */
function createInitialPanelState() {
  return {
    doc: { ...createEmptyDocument(), fecha: todayLocale() },
    activeClientName: null,
    activeFileIndex: null,
    backendId: null,
    backendState: null,
  };
}

/**
 * Aplica un borrador temporal cargado desde storage al estado inicial.
 */
function applyTempWork(temp) {
  if (!temp) return createInitialPanelState();
  return {
    doc: {
      ...createEmptyDocument(),
      ...temp,
      fecha: temp.fecha || todayLocale(),
    },
    activeClientName: null,
    activeFileIndex: null,
    backendId: temp._backendId || null,
    backendState: temp._backendState || null,
  };
}

export function useTekboState() {
  const [state, setState] = useState(() => {
    const temp = fetchTempWork();
    return temp ? applyTempWork(temp) : createInitialPanelState();
  });
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [clients, setClients] = useState(() => listClients());
  const [transitions, setTransitions] = useState([]);
  const [stockStatus, setStockStatus] = useState(null);
  const [backendMeta, setBackendMeta] = useState(null);
  const toastTimerRef = useRef(null);
  const saveInFlightRef = useRef(false);

  // Hook de documentos del backend (memoizado internamente para identidad estable).
  const sales = useTekboDocuments();

  // Guardamos las funciones de sales en refs para usarlas dentro de efectos
  // y callbacks sin que cambie la identidad de estos últimos. Esto evita
  // loops de re-render y re-disparos de useEffect.
  const salesRef = useRef(sales);
  useEffect(() => {
    salesRef.current = sales;
  }, [sales]);

  /* --------------------------- Helpers internos --------------------------- */

  const showToast = useCallback((message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2500);
  }, []);

  const refreshClients = useCallback(() => {
    setClients(listClients());
  }, []);

  const patchDoc = useCallback((patch) => {
    setState((s) => ({ ...s, doc: { ...s.doc, ...patch } }));
  }, []);

  /* --------------------------- Backend sync helpers ----------------------- */

  // Carga las transiciones disponibles y el stock status cuando hay backendId.
  // Se guarda en un ref para que la identidad sea estable; el useEffect
  // depende solo de `state.backendId` (valor primitivo).
  const refreshBackendInfo = useRef(async (backendId) => {
    if (!backendId) {
      setTransitions([]);
      setStockStatus(null);
      setBackendMeta(null);
      return;
    }
    try {
      const s = salesRef.current;
      const [trans, stock, full] = await Promise.all([
        s.getTransitions(backendId),
        s.getStockStatus(backendId),
        s.getById(backendId),
      ]);
      // Solo actualizar si seguimos en el mismo backendId (evita race conditions).
      setTransitions(trans);
      setStockStatus(stock);
      setBackendMeta(full._backend);
    } catch (err) {
      setTransitions([]);
      setStockStatus(null);
    }
  });

  // Efecto que dispara la carga de info del backend SOLO cuando cambia
  // el backendId (valor primitivo). No depende de refreshBackendInfo
  // (que es un ref estable), por lo que no hay loop.
  useEffect(() => {
    refreshBackendInfo.current(state.backendId);
  }, [state.backendId]);

  // Carga un documento del backend al draft local.
  const loadBackendDocument = useCallback(
    async (id) => {
      try {
        const adapted = await salesRef.current.getById(id);
        setState({
          doc: {
            cliente: adapted.cliente,
            fecha: adapted.fecha,
            direccion: adapted.direccion,
            celular: adapted.celular,
            descuento: adapted.descuento,
            isProforma: adapted.isProforma,
            items: adapted.items,
          },
          activeClientName: adapted.cliente,
          activeFileIndex: null,
          backendId: adapted._backend.id,
          backendState: adapted._backend.state,
        });
        setBackendMeta(adapted._backend);
        showToast(`📄 ${adapted._backend.code} cargado`);
      } catch (err) {
        showToast("No se pudo cargar el documento");
      }
    },
    [showToast]
  );

  // Aplica una transición en el backend y refresca el estado.
  const applyDocumentTransition = useCallback(
    async (transitionKey, { amount, note } = {}) => {
      if (!state.backendId) {
        showToast("Guarda el documento primero");
        return false;
      }
      try {
        const s = salesRef.current;
        const adapted = await s.transition(state.backendId, {
          transition: transitionKey,
          amount,
          note,
        });
        setState((prev) => ({
          ...prev,
          doc: {
            ...prev.doc,
            isProforma: adapted.isProforma,
            items: adapted.items,
          },
          backendState: adapted._backend.state,
        }));
        setBackendMeta(adapted._backend);
        const trans = await s.getTransitions(state.backendId);
        setTransitions(trans);
        const stock = await s.getStockStatus(state.backendId);
        setStockStatus(stock);
        showToast(`✓ ${adapted._backend.state_display}`);
        s.load();
        return true;
      } catch (err) {
        showToast(err?.detail || "Transición fallida");
        return false;
      }
    },
    [state.backendId, showToast]
  );

  /**
   * Borra el documento activo del backend y limpia el draft local.
   * Permite al vendedor descartar proformas/recibos que ya no necesita.
   */
  const deleteBackendDocument = useCallback(async (documentId = state.backendId) => {
    if (!documentId) {
      showToast("No hay documento del backend para borrar");
      return false;
    }
    const ok = window.confirm(
      "¿Borrar este documento del backend? Esta acción no se puede deshacer."
    );
    if (!ok) return false;
    try {
      await salesRef.current.remove(documentId);
      if (documentId === state.backendId) {
        setState({
          doc: { ...createEmptyDocument(), fecha: todayLocale() },
          activeClientName: null,
          activeFileIndex: null,
          backendId: null,
          backendState: null,
        });
        setBackendMeta(null);
        setTransitions([]);
        setStockStatus(null);
      }
      showToast("Documento eliminado");
      salesRef.current.load();
      return true;
    } catch (err) {
      showToast(err?.detail || "No se pudo eliminar el documento");
      return false;
    }
  }, [state.backendId, showToast]);

  const deleteActiveBackendDocument = useCallback(
    () => deleteBackendDocument(state.backendId),
    [deleteBackendDocument, state.backendId]
  );

  /* ----------------------------- Persistencia ----------------------------- */

  // Autoguardado del borrador temporal y del archivo activo.
  // Solo depende de valores primitivos + state.doc (que es estable entre renders).
  useEffect(() => {
    const interval = setInterval(() => {
      persistTempWork({
        ...state.doc,
        _backendId: state.backendId,
        _backendState: state.backendState,
      });
      if (state.activeClientName && state.activeFileIndex !== null) {
        const db = readDatabase();
        const client = findClient(db, state.activeClientName);
        if (client?.files?.[state.activeFileIndex]) {
          const nextDb = updateFile(
            db,
            state.activeClientName,
            state.activeFileIndex,
            state.doc
          );
          persistDatabase(nextDb);
        }
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [
    state.doc,
    state.activeClientName,
    state.activeFileIndex,
    state.backendId,
    state.backendState,
  ]);

  // Persistir borrador en cada cambio.
  useEffect(() => {
    persistTempWork({
      ...state.doc,
      _backendId: state.backendId,
      _backendState: state.backendState,
    });
  }, [state.doc, state.backendId, state.backendState]);

  /* ------------------------------- Acciones ------------------------------- */

  const setField = useCallback(
    (field, value) => {
      if (
        isLockedForEdit(state.backendState) &&
        (field === "items" || field === "descuento")
      ) {
        showToast("Documento bloqueado: revierte a proforma para editar");
        return;
      }
      const nextValue = field === "descuento"
        ? (value === "" ? "" : String(Math.max(0, Number(value) || 0)))
        : value;
      patchDoc({ [field]: nextValue });
    },
    [patchDoc, state.backendState, showToast]
  );

  const updateItem = useCallback(
    (index, field, value) => {
      if (isLockedForEdit(state.backendState)) {
        showToast("Documento bloqueado para edición");
        return;
      }
      setState((s) => {
        const items = [...s.doc.items];
        if (!items[index]) return s;
        const safeNumber = Math.max(0, parseFloat(value) || 0);
        items[index] = {
          ...items[index],
          [field]: field === "desc" ? value : safeNumber,
        };
        return { ...s, doc: { ...s.doc, items } };
      });
    },
    [state.backendState, showToast]
  );

  const addItem = useCallback(() => {
    if (isLockedForEdit(state.backendState)) {
      showToast("Documento bloqueado para edición");
      return;
    }
    setState((s) => {
      if (s.doc.items.length >= 7) return s;
      return {
        ...s,
        doc: {
          ...s.doc,
          items: [...s.doc.items, { desc: "", qty: 1, price: 0 }],
        },
      };
    });
  }, [state.backendState, showToast]);

  const addProductItem = useCallback(
    (product, qty = 1) => {
      if (isLockedForEdit(state.backendState)) {
        showToast("Documento bloqueado para edición");
        return false;
      }
      let changed = false;
      setState((s) => {
        const nextItems = addOrMergeItem(
          s.doc.items,
          createItemFromProduct(product, qty)
        );
        if (!nextItems) return s;
        changed = true;
        return {
          ...s,
          doc: {
            ...s.doc,
            items: nextItems,
          },
        };
      });
      if (changed) showToast(`✓ ${product?.nombre || "Producto"} agregado`);
      return changed;
    },
    [state.backendState, showToast]
  );

  const removeItemAt = useCallback(
    (index) => {
      if (isLockedForEdit(state.backendState)) {
        showToast("Documento bloqueado para edición");
        return;
      }
      setState((s) => {
        const items = [...s.doc.items];
        items.splice(index, 1);
        return { ...s, doc: { ...s.doc, items } };
      });
    },
    [state.backendState, showToast]
  );

  const toggleDocumentType = useCallback(() => {
    if (isLockedForEdit(state.backendState)) {
      showToast("Documento bloqueado para edición");
      return;
    }
    setState((s) => ({
      ...s,
      doc: { ...s.doc, isProforma: !s.doc.isProforma },
    }));
  }, [state.backendState, showToast]);

  const applyMagicInput = useCallback(
    (raw) => {
      if (isLockedForEdit(state.backendState)) {
        showToast("Documento bloqueado para edición");
        return;
      }
      import("../../services/tekbo/tekboMagicInputService").then(
        ({ parseMagicInput }) => {
          const action = parseMagicInput(raw, { currentItems: state.doc.items });
          if (!action) return;
          if (action.kind === "set-field") {
            patchDoc({ [action.field]: action.value });
            showToast(`✨ ${action.field} actualizado`);
          } else if (action.kind === "add-item") {
            setState((s) => {
              const items = addOrMergeItem(s.doc.items, action.item);
              if (!items) return s;
              return { ...s, doc: { ...s.doc, items } };
            });
            showToast("✨ Ítem agregado");
          }
        }
      );
    },
    [state.doc.items, patchDoc, showToast, state.backendState]
  );

  const selectFile = useCallback(
    (clientName, fileIndex) => {
      const db = readDatabase();
      const client = findClient(db, clientName);
      if (!client?.files?.[fileIndex]) return;
      const data = client.files[fileIndex].data;
      setState({
        doc: { ...createEmptyDocument(), ...data },
        activeClientName: clientName,
        activeFileIndex: fileIndex,
        backendId: data._backendId || null,
        backendState: data._backendState || null,
      });
      setMenuOpen(false);
      showToast("Archivo cargado");
    },
    [showToast]
  );

  const prepareNewSheetForClient = useCallback(
    (clientName) => {
      const db = readDatabase();
      const client = findClient(db, clientName);
      const lastData = getLastFileData(client);
      setState({
        doc: {
          ...createEmptyDocument(),
          cliente: clientName,
          direccion: lastData.direccion || "",
          celular: lastData.celular || "",
          fecha: todayLocale(),
        },
        activeClientName: clientName,
        activeFileIndex: null,
        backendId: null,
        backendState: null,
      });
      setMenuOpen(false);
      showToast(`Nueva hoja para ${clientName}`);
    },
    [showToast]
  );

  /**
   * Guarda el documento: además de persistir en localStorage, sincroniza
   * con el backend (crea o actualiza según tenga backendId).
   */
  const save = useCallback(async () => {
    if (saveInFlightRef.current) {
      showToast("El documento ya se está guardando…");
      return;
    }
    const validation = validateForSave(state.doc);
    if (!validation.ok) {
      showToast(validation.message);
      return;
    }

    saveInFlightRef.current = true;
    try {
      const s = salesRef.current;

    // 1) Si hay backendId, actualizar en el backend.
    if (state.backendId) {
      if (isLockedForEdit(state.backendState)) {
        showToast("Documento bloqueado en el backend");
        return;
      }
      try {
        const adapted = await s.update(
          state.backendId,
          state.doc,
          state.doc.isProforma
        );
        setState((prev) => ({ ...prev, backendState: adapted._backend.state }));
        setBackendMeta(adapted._backend);
        showToast("Actualizado en el backend");
        s.load();
        return;
      } catch (err) {
        showToast(err?.detail || "No se pudo actualizar en el backend");
        return;
      }
    }

    // 2) Si no hay backendId, crear en el backend.
      try {
        const adapted = await s.create(state.doc, state.doc.isProforma);
        setState((prev) => ({
          ...prev,
          backendId: adapted._backend.id,
          backendState: adapted._backend.state,
          activeClientName: adapted.cliente,
          activeFileIndex: null,
        }));
        setBackendMeta(adapted._backend);
        const db = readDatabase();
        const { db: nextDb, fileIndex } = addFileToClient(
          db,
          adapted.cliente,
          {
            isProforma: adapted.isProforma,
            data: {
              ...state.doc,
              _backendId: adapted._backend.id,
              _backendState: adapted._backend.state,
            },
          }
        );
        persistDatabase(nextDb);
        setState((prev) => ({ ...prev, activeFileIndex: fileIndex }));
        refreshClients();
        s.load();
        showToast(`✓ Creado: ${adapted._backend.code}`);
      } catch (err) {
        showToast(err?.detail || "No se pudo crear en el backend");
      }
    } finally {
      saveInFlightRef.current = false;
    }
  }, [
    state.doc,
    state.backendId,
    state.backendState,
    state.activeClientName,
    showToast,
    refreshClients,
  ]);

  const resetForm = useCallback(
    (ask = true) => {
      if (ask && (state.activeClientName || state.backendId)) {
        const ok = window.confirm("¿Limpiar formulario para nueva hoja?");
        if (!ok) return;
      }
      setState({
        doc: { ...createEmptyDocument(), fecha: todayLocale() },
        activeClientName: null,
        activeFileIndex: null,
        backendId: null,
        backendState: null,
      });
      setBackendMeta(null);
      setTransitions([]);
      setStockStatus(null);
      showToast("Formulario limpio");
    },
    [state.activeClientName, state.backendId, showToast]
  );

  const deleteClient = useCallback(
    (clientName) => {
      const ok = window.confirm(
        "⚠ ADVERTENCIA:\nAl borrar esto se borrarán todas las proformas y recibos de este cliente.\n\n¿Estás seguro?"
      );
      if (!ok) return;
      const nextDb = removeClient(readDatabase(), clientName);
      persistDatabase(nextDb);
      refreshClients();
      if (state.activeClientName === clientName) {
        setState({
          doc: { ...createEmptyDocument(), fecha: todayLocale() },
          activeClientName: null,
          activeFileIndex: null,
          backendId: null,
          backendState: null,
        });
      }
      showToast("Cliente eliminado");
    },
    [state.activeClientName, showToast, refreshClients]
  );

  const deleteFile = useCallback(
    (clientName, fileIndex) => {
      const ok = window.confirm("¿Borrar este archivo permanentemente?");
      if (!ok) return;
      const nextDb = removeFile(readDatabase(), clientName, fileIndex);
      persistDatabase(nextDb);
      refreshClients();

      setState((s) => {
        if (s.activeClientName !== clientName) return s;
        if (s.activeFileIndex === fileIndex) {
          return {
            doc: { ...createEmptyDocument(), fecha: todayLocale() },
            activeClientName: null,
            activeFileIndex: null,
            backendId: null,
            backendState: null,
          };
        }
        if (s.activeFileIndex !== null && s.activeFileIndex > fileIndex) {
          return { ...s, activeFileIndex: s.activeFileIndex - 1 };
        }
        return s;
      });
      showToast("Archivo eliminado");
    },
    [showToast, refreshClients]
  );

  /* ----------------------------- UI derivada ------------------------------ */

  const toolbar = useMemo(() => {
    const menuLabel = (() => {
      if (state.backendId && backendMeta?.code) {
        return `📄 ${backendMeta.code}`;
      }
      if (!state.activeClientName) return LABELS.MENU_TRIGGER_DEFAULT;
      if (state.activeFileIndex === null) {
        return `👤 ${state.activeClientName} (Nueva Hoja)`;
      }
      const client = findClient(readDatabase(), state.activeClientName);
      if (client?.files?.[state.activeFileIndex]) {
        return `📄 ${client.files[state.activeFileIndex].name}`;
      }
      return `👤 ${state.activeClientName} (Nueva)`;
    })();

    const saveLabel = (() => {
      if (isLockedForEdit(state.backendState)) return "BLOQUEADO";
      if (state.backendId) return LABELS.BUTTON_UPDATE;
      if (!state.activeClientName) return LABELS.BUTTON_SAVE;
      return state.activeFileIndex === null
        ? LABELS.BUTTON_SAVE_NEW
        : LABELS.BUTTON_UPDATE;
    })();

    return { menuLabel, saveLabel };
  }, [
    state.activeClientName,
    state.activeFileIndex,
    state.backendId,
    state.backendState,
    backendMeta,
  ]);

  return {
    // estado
    doc: state.doc,
    activeClientName: state.activeClientName,
    activeFileIndex: state.activeFileIndex,
    backendId: state.backendId,
    backendState: state.backendState,
    backendMeta,
    clients,
    menuOpen,
    toast,
    toolbar,
    transitions,
    stockStatus,
    isLocked: isLockedForEdit(state.backendState),
    isTerminal: isTerminal(state.backendState),
    // acciones
    setMenuOpen,
    setField,
    updateItem,
    addItem,
    addProductItem,
    removeItem: removeItemAt,
    toggleDocumentType,
    applyMagicInput,
    selectFile,
    prepareNewSheetForClient,
    save,
    resetForm,
    deleteClient,
    deleteFile,
    deleteActiveBackendDocument,
    deleteBackendDocument,
    showToast,
    // backend
    loadBackendDocument,
    applyDocumentTransition,
    // documentos backend
    sales,
  };
}
