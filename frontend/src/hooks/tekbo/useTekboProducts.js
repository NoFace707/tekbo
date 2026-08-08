/**
 * useTekboProducts.js
 *
 * Single Responsibility: cargar el catálogo de productos desde el backend
 * para que el vendedor los pueda seleccionar en el panel Tekbo.
 *
 * Es un wrapper delgado sobre useProducts (reutiliza la lógica HTTP y de
 * estado) — DRY + Liskov Substitution (se puede sustituir por otra
 * implementación que cargue productos de otro origen sin tocar el
 * ProductPicker).
 *
 * Solo lectura: el vendedor no crea/edita productos desde el panel.
 */

import { useEffect, useMemo } from "react";
import { useProducts } from "../products/useProducts";
import { listProducts } from "../../services/productsService";

export function useTekboProducts({ autoload = true } = {}) {
  const {
    products,
    loading,
    error,
    search,
    setSearch,
    inStockOnly,
    setInStockOnly,
    load,
    setError,
  } = useProducts({ autoload: false });

  // Carga inicial.
  useEffect(() => {
    if (autoload) load();
  }, [autoload, load]);

  // Solo productos con stock > 0 por defecto en el picker (configurable
  // desde el componente). Aquí devolvemos todos para que el picker decida.
  const inStockProducts = useMemo(
    () => products.filter((p) => Number(p.stock) > 0),
    [products]
  );

  return {
    // estado
    products,
    inStockProducts,
    loading,
    error,
    search,
    inStockOnly,
    // setters
    setSearch,
    setInStockOnly,
    setError,
    // acciones
    reload: load,
    // Exponemos listProducts directo por si el picker necesita un fetch
    // puntual sin pasar por el estado (p. ej. autocomplete).
    fetchProducts: listProducts,
  };
}
