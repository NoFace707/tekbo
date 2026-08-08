/**
 * useProducts.js
 *
 * Single Responsibility: estado del listado de productos + acciones de CRUD.
 *
 * Depende del servicio productsService (abstracción HTTP) — no conoce
 * detalles de fetch ni URLs (Dependency Inversion).
 *
 * Devuelve datos + acciones; los componentes solo lo consumen.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createProduct as apiCreateProduct,
  deleteProduct as apiDeleteProduct,
  listProducts,
  updateProduct as apiUpdateProduct,
} from "../../services/productsService";
import { getErrorMessage } from "../../lib/utils";

/**
 * @param {{search?:string, in_stock?:boolean, ordering?:string, autoload?:boolean}} initial
 */
export function useProducts(initial = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(initial.search || "");
  const [inStockOnly, setInStockOnly] = useState(initial.in_stock ?? false);
  const autoload = initial.autoload !== false;

  // Contador de refresh para forzar reload manual.
  const [refreshTick, setRefreshTick] = useState(0);
  const reqIdRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const myReqId = ++reqIdRef.current;
    try {
      const data = await listProducts({
        search: search.trim() || undefined,
        in_stock: inStockOnly ? true : undefined,
      });
      // Evitar race conditions si cambian los filtros mientras carga.
      if (reqIdRef.current !== myReqId) return;
      setProducts(data);
    } catch (err) {
      if (reqIdRef.current !== myReqId) return;
      setError(getErrorMessage(err, "No se pudo cargar el catálogo."));
    } finally {
      if (reqIdRef.current === myReqId) setLoading(false);
    }
  }, [search, inStockOnly]);

  // Debounce de búsqueda.
  useEffect(() => {
    if (!autoload) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load, refreshTick, autoload]);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const createProduct = useCallback(async (payload) => {
    const created = await apiCreateProduct(payload);
    refresh();
    return created;
  }, [refresh]);

  const updateProduct = useCallback(async (id, payload) => {
    const updated = await apiUpdateProduct(id, payload);
    refresh();
    return updated;
  }, [refresh]);

  const removeProduct = useCallback(async (id) => {
    await apiDeleteProduct(id);
    refresh();
  }, [refresh]);

  return {
    // estado
    products,
    loading,
    error,
    search,
    inStockOnly,
    // setters
    setSearch,
    setInStockOnly,
    setError,
    // acciones
    load,
    refresh,
    createProduct,
    updateProduct,
    removeProduct,
  };
}
