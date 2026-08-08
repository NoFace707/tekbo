/**
 * TekboControlPanel.jsx
 *
 * Single Responsibility: contenedor del panel de control Tekbo.
 *
 * Orquesta la composición de los subcomponentes (toolbar, magic assistant,
 * form de cliente, picker de productos, editor de ítems, acciones, recibo
 * imprimible) usando el hook useTekboState como única fuente de verdad.
 *
 * No implementa lógica de negocio directamente: la delega en el hook y en
 * los servicios (Dependency Inversion + Single Responsibility).
 *
 * Integra además:
 *  - DocumentStatusBadge: muestra el estado actual del documento.
 *  - DocumentTransitionBar: acciones para avanzar/revertir el flujo.
 *  - DocumentListPanel: lista de documentos del backend.
 */

import { useMemo } from "react";
import { useTekboState } from "../../hooks/tekbo/useTekboState";
import { useTekboProducts } from "../../hooks/tekbo/useTekboProducts";
import { computeTotals, canAddItem } from "../../services/tekbo";
import TekboToolbar from "./TekboToolbar";
import MagicAssistant from "./MagicAssistant";
import CustomerForm from "./CustomerForm";
import ProductPicker from "./ProductPicker";
import ItemsEditor from "./ItemsEditor";
import DiscountInput from "./DiscountInput";
import DocumentActions from "./DocumentActions";
import ReceiptDocument from "./ReceiptDocument";
import TekboToast from "./TekboToast";
import DocumentStatusBadge from "./DocumentStatusBadge";
import DocumentTransitionBar from "./DocumentTransitionBar";
import DocumentListPanel from "./DocumentListPanel";
import { LABELS } from "../../services/tekbo";

export default function TekboControlPanel() {
  const tekbo = useTekboState();
  const catalog = useTekboProducts({ autoload: true });

  const totals = useMemo(() => computeTotals(tekbo.doc), [tekbo.doc]);
  const canAddMore = canAddItem(tekbo.doc.items) && !tekbo.isLocked;

  const handlePrint = () => window.print();

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Columna principal */}
      <div className="space-y-4">
        <div className="no-print mx-auto w-full max-w-[850px] rounded-xl border border-slate-200 bg-white shadow-md">
          {/* Header del panel */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-xl bg-brand-800 px-5 py-3.5 text-white">
            <h2 className="m-0 font-tekbo text-lg tracking-wide">
              {LABELS.PANEL_TITLE}
            </h2>
            <div className="flex items-center gap-2">
              {tekbo.backendState && (
                <DocumentStatusBadge
                  state={tekbo.backendState}
                  code={tekbo.backendMeta?.code}
                />
              )}
              <div className="text-[11px] opacity-80">
                {LABELS.PANEL_VERSION}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5">
            <TekboToolbar
              menuLabel={tekbo.toolbar.menuLabel}
              saveLabel={tekbo.toolbar.saveLabel}
              menuOpen={tekbo.menuOpen}
              onToggleMenu={tekbo.setMenuOpen}
              onResetForm={() => tekbo.resetForm(true)}
              onSave={tekbo.save}
              onDelete={tekbo.deleteActiveBackendDocument}
              canDelete={!!tekbo.backendId}
              saveDisabled={tekbo.isLocked}
              clients={tekbo.clients}
              activeClientName={tekbo.activeClientName}
              activeFileIndex={tekbo.activeFileIndex}
              onSelectFile={tekbo.selectFile}
              onPrepareNewSheet={tekbo.prepareNewSheetForClient}
              onDeleteClient={tekbo.deleteClient}
              onDeleteFile={tekbo.deleteFile}
            />

            {tekbo.isLocked && (
              <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                🔒 Documento en estado <strong>
                  {tekbo.backendMeta?.state_display || tekbo.backendState}
                </strong>.
                La edición de ítems está bloqueada. Revertir a proforma para modificar.
              </div>
            )}

            {/* Barra de transiciones de estado */}
            {tekbo.backendId && tekbo.transitions.length > 0 && (
              <div className="mb-4">
                <DocumentTransitionBar
                  transitions={tekbo.transitions}
                  onApply={tekbo.applyDocumentTransition}
                  disabled={tekbo.isLocked && !tekbo.transitions.some(t => t.key === "close")}
                  paidTotal={tekbo.backendMeta?.paid_total}
                  balanceDue={tekbo.backendMeta?.balance_due}
                />
              </div>
            )}

            {/* Avisos de stock insuficiente */}
            {tekbo.stockStatus?.items?.some((it) => !it.enough) && (
              <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                ⚠ Stock insuficiente para algunos ítems:{" "}
                {tekbo.stockStatus.items
                  .filter((it) => !it.enough)
                  .map(
                    (it) =>
                      `${it.product_name} (solicitado ${it.requested}, disponible ${it.available})`
                  )
                  .join("; ")}
              </div>
            )}

            <MagicAssistant onApply={tekbo.applyMagicInput} disabled={tekbo.isLocked} />

            <CustomerForm values={tekbo.doc} onChange={tekbo.setField} />

            {catalog.error ? (
              <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                No se pudo cargar el catálogo: {catalog.error}
              </div>
            ) : null}

            <ProductPicker
              products={catalog.inStockProducts}
              onAddProduct={tekbo.addProductItem}
              canAddMore={canAddMore}
            />

            <ItemsEditor
              items={tekbo.doc.items}
              onAdd={tekbo.addItem}
              onUpdate={tekbo.updateItem}
              onRemove={tekbo.removeItem}
              readOnly={tekbo.isLocked}
            />

            <DiscountInput
              value={tekbo.doc.descuento}
              onChange={tekbo.setField}
              readOnly={tekbo.isLocked}
            />

            <DocumentActions
              isProforma={tekbo.doc.isProforma}
              onToggleType={tekbo.toggleDocumentType}
              onPrint={handlePrint}
              disabled={tekbo.isLocked}
            />
          </div>
        </div>

        {/* Resumen rápido del monto a pagar */}
        <div className="no-print mx-auto w-full max-w-[850px] rounded-xl border border-lime-300 bg-lime-100 px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-lime-900">
                Monto a pagar
              </p>
              <p className="text-xs text-lime-800">
                Subtotal − Descuento · {tekbo.doc.items.length} ítem
                {tekbo.doc.items.length === 1 ? "" : "s"} ·{" "}
                {tekbo.doc.isProforma ? "PROFORMA" : "RECIBO"}
                {tekbo.backendMeta?.paid_total > 0 && (
                  <>
                    {" · Pagado: "}
                    {tekbo.backendMeta.paid_total.toFixed(2)} Bs
                  </>
                )}
                {tekbo.backendMeta?.balance_due > 0 && (
                  <>
                    {" · Saldo: "}
                    {tekbo.backendMeta.balance_due.toFixed(2)} Bs
                  </>
                )}
              </p>
            </div>
            <p className="font-tekbo text-3xl font-bold text-brand-800">
              {new Intl.NumberFormat("es-BO", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(totals.total)}{" "}
              Bs
            </p>
          </div>
        </div>

        {/* Recibo/Proforma imprimible */}
        <div className="mx-auto w-full max-w-[850px]">
          <ReceiptDocument
            doc={tekbo.doc}
            totals={totals}
            backendMeta={tekbo.backendMeta}
          />
        </div>
      </div>

      {/* Columna lateral: lista de documentos del backend */}
      <aside className="no-print">
        <DocumentListPanel
          documents={tekbo.sales.documents}
          loading={tekbo.sales.loading}
          activeId={tekbo.backendId}
          onSelect={tekbo.loadBackendDocument}
          onRefresh={() => tekbo.sales.load()}
          onDelete={(id) => tekbo.deleteBackendDocument(id)}
        />
      </aside>

      <TekboToast message={tekbo.toast} />
    </div>
  );
}
