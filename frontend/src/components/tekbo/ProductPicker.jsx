/**
 * ProductPicker.jsx
 *
 * Single Responsibility: selector de productos del catálogo para el panel
 * Tekbo. Permite al vendedor buscar y agregar productos al documento como
 * ítems (con qty ajustable y precio = costo del producto, editable después
 * en ItemsEditor).
 *
 * No realiza descuento de stock (queda pendiente de discusión).
 *
 * Recibe por props:
 *  - products: lista de productos
 *  - onAddProduct(product, qty): callback que el hook useTekboState usa
 *    para agregar el ítem al documento.
 *  - canAddMore: bool que indica si el documento todavía acepta ítems
 *    (respeta MAX_ITEM_ROWS = 7).
 */

import { useMemo, useState } from "react";
import { formatCurrency } from "../../services/tekbo";

function fmtBs(value) {
  // Mantenemos "Bs" para legibilidad; value puede venir como string.
  return formatCurrency(value);
}

export default function ProductPicker({
  products,
  onAddProduct,
  canAddMore,
}) {
  const [query, setQuery] = useState("");
  const [qtyByProduct, setQtyByProduct] = useState({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        (p.nombre || "").toLowerCase().includes(q) ||
        (p.detalle || "").toLowerCase().includes(q)
    );
  }, [products, query]);

  const handleAdd = (product) => {
    const qty = Math.max(1, parseInt(qtyByProduct[product.id] || "1", 10) || 1);
    onAddProduct?.(product, qty);
    setQtyByProduct((s) => ({ ...s, [product.id]: "1" }));
  };

  return (
    <div className="mb-6 rounded-xl border-2 border-brand-200 bg-brand-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <label className="text-[11px] font-extrabold uppercase tracking-wide text-brand-800">
          🛒 Catálogo de productos
        </label>
        {!canAddMore && (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
            {products.length === 0 ? "Cargando..." : "No se pueden agregar ítems"}
          </span>
        )}
      </div>

      {/* Buscador */}
      <div className="relative mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto por nombre o detalle..."
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2.5 pl-9 text-sm outline-none focus:border-brand-800"
        />
        <svg
          className="pointer-events-none absolute left-2.5 top-3 h-4 w-4 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
      </div>

      {/* Lista de productos */}
      <div className="max-h-[280px] overflow-y-auto rounded-lg border border-brand-100 bg-white">
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-slate-400">
            No se encontraron productos.
          </div>
        ) : (
          filtered.map((p) => {
            const qty = qtyByProduct[p.id] || "1";
            const inStock = Number(p.stock) > 0;
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5 last:border-b-0"
              >
                <div className="min-w-[160px] flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {p.nombre}
                  </p>
                  {p.detalle && (
                    <p className="line-clamp-1 text-[11px] text-slate-500">
                      {p.detalle}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-brand-800">
                    {fmtBs(p.costo)}
                  </p>
                  <p
                    className={[
                      "text-[10px] font-semibold",
                      inStock ? "text-lime-800" : "text-rose-600",
                    ].join(" ")}
                  >
                    Stock: {p.stock}
                  </p>
                </div>

                <div className="w-16">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={qty}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = Number(raw);
                      setQtyByProduct((s) => ({
                        ...s,
                        [p.id]: raw === "" ? "" : Number.isFinite(parsed) ? String(Math.max(1, Math.trunc(parsed))) : "1",
                      }));
                    }}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-center text-sm outline-none focus:border-brand-800"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleAdd(p)}
                  disabled={!canAddMore || !inStock}
                  title={
                    !inStock
                      ? "Sin stock disponible"
                      : !canAddMore
                      ? "Máximo de ítems alcanzado"
                      : "Agregar al documento"
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-lime-700 text-lg font-bold text-white transition hover:bg-lime-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            );
          })
        )}
      </div>

      <p className="mt-2 text-[10px] text-slate-500">
        El precio del ítem se inicializa con el costo del producto; puedes
        editarlo manualmente en la lista de ítems. El stock físico se descuenta
        solo al confirmar el Recibo Final (no en proforma ni en anticipo).
      </p>
    </div>
  );
}
