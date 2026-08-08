/**
 * AdminProductsPage.jsx
 *
 * Single Responsibility: página de administración del catálogo de productos.
 *
 * Solo orquesta: el estado vive en el hook useProducts y la lógica HTTP
 * en productsService. La UI solo presenta y emite acciones.
 *
 * Funcionalidad:
 *  - Tabla con buscador + filtro "solo en stock".
 *  - Modal crear / editar (nombre, detalle, stock, costo en Bs).
 *  - Confirmación de borrado.
 *
 * No toca stock al vender (eso queda pendiente de discusión).
 */

import { useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useProducts } from "../hooks/products/useProducts";
import { getErrorMessage } from "../lib/utils";

function emptyForm() {
  return { nombre: "", detalle: "", stock: 0, costo: "" };
}

function fmtBs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Bs`;
}

export default function AdminProductsPage() {
  const {
    products,
    loading,
    error,
    search,
    setSearch,
    inStockOnly,
    setInStockOnly,
    setError,
    createProduct,
    updateProduct,
    removeProduct,
  } = useProducts();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(null);

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setForm({
      nombre: p.nombre || "",
      detalle: p.detalle || "",
      stock: p.stock ?? 0,
      // Mostramos el costo como string plano para que el input number no trabe.
      costo: p.costo != null ? String(p.costo) : "",
    });
    setEditingId(p.id);
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.nombre.trim()) {
      setFormError("El nombre es obligatorio.");
      return;
    }
    const stockNum = Number(form.stock);
    if (!Number.isFinite(stockNum) || stockNum < 0) {
      setFormError("El stock debe ser un número entero mayor o igual a 0.");
      return;
    }
    const costoNum = Number(form.costo);
    if (!Number.isFinite(costoNum) || costoNum < 0) {
      setFormError("El costo debe ser un número mayor o igual a 0.");
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      detalle: form.detalle.trim(),
      stock: Math.trunc(stockNum),
      costo: costoNum.toFixed(2),
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await createProduct(payload);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(getErrorMessage(err, "No se pudo guardar el producto."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await removeProduct(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar el producto."));
      setConfirmDelete(null);
    }
  };

  return (
    <MainLayout
      title="Catálogo de productos"
      subtitle={`${products.length} ${products.length === 1 ? "producto" : "productos"}`}
    >
      <section className="space-y-5">
        {error && (
          <Alert tone="danger" onClose={() => setError("")}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o detalle..."
                className="w-72 pl-9"
              />
              <svg
                className="pointer-events-none absolute left-2.5 top-2.5 h-5 w-5 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-800 focus:ring-brand-400"
              />
              Solo con stock
            </label>
          </div>

          <Button onClick={openCreate} className="shrink-0">
            <PlusIcon className="mr-2 h-4 w-4" />
            Nuevo producto
          </Button>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-4">
                  <div className="h-10 w-10 rounded bg-slate-200" />
                  <div className="h-4 w-40 rounded bg-slate-200" />
                  <div className="h-4 w-24 rounded bg-slate-200" />
                  <div className="h-4 w-20 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <BoxIcon className="mb-3 h-12 w-12" />
              <p className="text-sm font-medium">No hay productos para mostrar</p>
              <p className="mt-1 text-xs">Crea un producto o ajusta la búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="py-3.5 pl-6 pr-4">Nombre</th>
                    <th className="py-3.5 pr-4">Detalle</th>
                    <th className="py-3.5 pr-4 text-right">Stock</th>
                    <th className="py-3.5 pr-4 text-right">Costo</th>
                    <th className="py-3.5 pr-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-50 transition-colors hover:bg-slate-50/60"
                    >
                      <td className="py-3.5 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
                            <BoxIcon className="h-5 w-5" />
                          </div>
                          <p className="font-semibold text-slate-800">{p.nombre}</p>
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-600">
                        <span className="line-clamp-2 max-w-[260px]">
                          {p.detalle || "—"}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <span
                          className={[
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            p.stock > 0
                              ? "bg-lime-100 text-lime-900"
                              : "bg-rose-50 text-rose-700",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "h-1.5 w-1.5 rounded-full",
                              p.stock > 0 ? "bg-lime-700" : "bg-rose-500",
                            ].join(" ")}
                          />
                          {p.stock}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-right font-mono text-slate-700">
                        {fmtBs(p.costo)}
                      </td>
                      <td className="py-3.5 pr-6">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(p)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-800"
                            title="Editar"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(p)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                            title="Eliminar"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Modal crear/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div className="absolute inset-0 bg-slate-900/40" onClick={closeModal} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {editingId ? "Editar producto" : "Nuevo producto"}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingId
                    ? "Actualiza los datos del producto"
                    : "Completa los campos para crear el producto"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {formError && (
                <Alert tone="danger">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label>
                  Nombre <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={form.nombre}
                  onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
                  required
                  placeholder="Ej: Pantalla LED 32"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label>Detalle</Label>
                <textarea
                  value={form.detalle}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, detalle: e.target.value }))
                  }
                  rows={3}
                  placeholder="Descripción técnica, marca, modelo..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(e) => setForm((s) => ({ ...s, stock: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Costo (Bs)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costo}
                    onChange={(e) => setForm((s) => ({ ...s, costo: e.target.value }))}
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Guardando...
                    </>
                  ) : editingId ? (
                    "Guardar cambios"
                  ) : (
                    "Crear producto"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación de borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setConfirmDelete(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <svg
                className="h-6 w-6 text-rose-600"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">
              Eliminar producto
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Estás a punto de eliminar{" "}
              <span className="font-semibold text-slate-800">{confirmDelete.nombre}</span>.
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <button
                onClick={handleDelete}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

/* Icons */
function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function PencilIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 20h9" strokeLinecap="round" />
      <path
        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function BoxIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path
        d="M21 8l-9-5-9 5 9 5 9-5z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M3 8v8l9 5 9-5V8" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M12 13v8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
