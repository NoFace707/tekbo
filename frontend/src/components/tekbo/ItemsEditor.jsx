/**
 * ItemsEditor.jsx
 *
 * Single Responsibility: edición de la lista de ítems (detalle del recibo).
 * Permite agregar/quitar ítems y editar descripción / cantidad / precio.
 *
 * Si readOnly=true (documento bloqueado), los inputs se deshabilitan.
 */

import { canAddItem } from "../../services/tekbo";

export default function ItemsEditor({
  items,
  maxRows = 7,
  onAdd,
  onUpdate,
  onRemove,
  readOnly = false,
}) {
  const canAdd = canAddItem(items) && !readOnly;

  return (
    <>
      <div className="mb-4 rounded-lg border-2 border-dashed border-slate-200 bg-white p-4">
        {items.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Sin ítems. Presiona “+ AGREGAR ÍTEM”.
          </div>
        ) : (
          items.map((it, i) => (
            <div
              key={i}
              className="mb-4 flex flex-wrap items-end gap-2.5 border-b border-slate-100 pb-4 last:mb-0 last:border-b-0 last:pb-0"
            >
              <div className="min-w-[200px] flex-4">
                <input
                  placeholder="Desc"
                  value={it.desc}
                  onChange={(e) => onUpdate(i, "desc", e.target.value)}
                  disabled={readOnly}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-800 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              <div className="min-w-[70px] flex-1">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="#"
                  value={it.qty}
                  onChange={(e) => onUpdate(i, "qty", e.target.value)}
                  disabled={readOnly}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-800 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              <div className="min-w-[90px] flex-1">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="$"
                  value={it.price}
                  onChange={(e) => onUpdate(i, "price", e.target.value)}
                  disabled={readOnly}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-800 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                disabled={readOnly}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-sm font-bold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className="mb-4 inline-block rounded bg-brand-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        + AGREGAR ÍTEM
      </button>
      {!canAdd && !readOnly && (
        <span className="ml-3 text-[11px] text-slate-400">
          Máximo {maxRows} ítems por hoja.
        </span>
      )}
    </>
  );
}
