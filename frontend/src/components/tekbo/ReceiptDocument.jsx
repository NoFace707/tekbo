/**
 * ReceiptDocument.jsx
 *
 * Single Responsibility: render del recibo/proforma imprimible Tekbo.
 * Recibe el documento y los totales ya calculados; no hace lógica de negocio.
 *
 * Estructura visual fiel al HTML original "Web final v7.html":
 *  - Banda azul superior
 *  - Header con logo + título (RECIBO/PROFORMA)
 *  - Datos del cliente
 *  - Tabla de detalle (7 filas)
 *  - Subtotal / Descuento / Total
 *  - Firmas (solo en RECIBO)
 *  - Footer con imagen
 *
 * Adicional: si llega backendMeta, muestra el estado del documento y
 * los pagos registrados (anticipo / saldo).
 */

import {
  BRAND_ASSETS,
  DOCUMENT_TYPE,
  DOCUMENT_STATE_LABEL,
  STATE_COLOR,
  padItemsForPrint,
} from "../../services/tekbo";
import { formatCurrency } from "../../services/tekbo";

export default function ReceiptDocument({ doc, totals, backendMeta }) {
  const title = doc.isProforma ? DOCUMENT_TYPE.PROFORMA : DOCUMENT_TYPE.RECIBO;
  const rows = padItemsForPrint(doc.items);

  return (
    <div className="tekbo-receipt mx-auto w-full max-w-[710px] bg-white">
      {/* Banda superior */}
      <div className="h-5 w-full bg-brand-800" />

      {/* Header con logo + título */}
      <div className="flex items-center bg-white px-4 py-3">
        <div className="w-1/3 px-2 text-center">
          <img
            src={BRAND_ASSETS.LOGO}
            alt="Logo Tekbo"
            className="mx-auto block w-[140px] max-w-full"
            style={{ border: 0 }}
          />
        </div>
        <div className="w-2/3 px-2 text-center">
          <h1
            className="m-0 text-center font-tekbo text-[43px] leading-tight text-brand-800"
            style={{ letterSpacing: "1px" }}
          >
            {title}
          </h1>
          {backendMeta?.code && (
            <p className="m-0 mt-1 font-mono text-[11px] text-slate-500">
              {backendMeta.code}
            </p>
          )}
        </div>
      </div>

      {/* Banner de estado del documento */}
      {backendMeta?.state && (
        <div className="px-4 pb-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
              STATE_COLOR[backendMeta.state]?.border || ""
            } ${STATE_COLOR[backendMeta.state]?.bg || ""} ${
              STATE_COLOR[backendMeta.state]?.text || ""
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                STATE_COLOR[backendMeta.state]?.dot || ""
              }`}
            />
            {DOCUMENT_STATE_LABEL[backendMeta.state] || backendMeta.state}
          </span>
        </div>
      )}

      {/* Datos del cliente */}
      <div className="flex flex-wrap bg-white px-4 py-2">
        <div className="w-full px-3 py-1 sm:w-1/2">
          <p className="m-0 text-[15px] text-slate-800">
            Cliente:{" "}
            <strong className="text-[16px]">{doc.cliente || ""}</strong>
          </p>
          <p className="m-0 mt-1 text-[15px] text-slate-800">
            Dirección: <strong>{doc.direccion || ""}</strong>
          </p>
        </div>
        <div className="w-full px-3 py-1 sm:w-1/2">
          <p className="m-0 text-[15px] text-slate-800">
            Fecha: <strong>{doc.fecha || ""}</strong>
          </p>
          <p className="m-0 mt-1 text-[15px] text-slate-800">
            Celular: <strong>{doc.celular || ""}</strong>
          </p>
        </div>
      </div>

      {/* Imagen publicitaria */}
      <div className="bg-white px-4 py-2">
        <img
          src={BRAND_ASSETS.AD}
          alt="Publicidad"
          className="block w-[220px] max-w-full"
          style={{ border: 0 }}
        />
      </div>

      {/* Tabla de detalle */}
      <div className="bg-white px-4 pb-2">
        <table className="w-full border-collapse font-sans text-sm">
          <thead className="bg-brand-800 text-white">
            <tr>
              <th className="w-[40%] px-2 py-2.5 text-left">Detalle</th>
              <th className="w-[15%] px-2 py-2.5 text-center">Cant.</th>
              <th className="w-[22%] px-2 py-2.5 text-right">P. Unit</th>
              <th className="w-[23%] px-2 py-2.5 pr-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it, i) => {
              if (!it) {
                return (
                  <tr key={i}>
                    <td colSpan={4} style={{ height: 22 }} />
                  </tr>
                );
              }
              const lineTotal = (Number(it.qty) || 0) * (Number(it.price) || 0);
              return (
                <tr key={i}>
                  <td className="px-2 py-2.5">{it.desc}</td>
                  <td className="px-2 py-2.5 text-center">{it.qty}</td>
                  <td className="px-2 py-2.5 text-right">
                    {formatCurrency(it.price)}
                  </td>
                  <td className="px-2 py-2.5 pr-2.5 text-right">
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={2} />
              <td className="px-2 py-1.5 text-right">Subtotal</td>
              <td className="px-2 py-1.5 text-right">
                {formatCurrency(totals.subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={2} />
              <td className="px-2 py-1.5 text-right">Descuento</td>
              <td className="px-2 py-1.5 text-right">
                {formatCurrency(totals.descuento)}
              </td>
            </tr>
            <tr className="bg-brand-800 text-white">
              <td colSpan={2} />
              <td className="px-2 py-1.5 text-right">
                <strong>TOTAL</strong>
              </td>
              <td className="px-2 py-1.5 text-right">
                <strong>{formatCurrency(totals.total)}</strong>
              </td>
            </tr>
            {/* Si hay pagos registrados, mostrar líneas adicionales */}
            {backendMeta?.paid_total > 0 && (
              <>
                <tr>
                  <td colSpan={2} />
                  <td className="px-2 py-1.5 text-right text-amber-700">
                    Anticipo / Pagado
                  </td>
                  <td className="px-2 py-1.5 text-right text-amber-700">
                    {formatCurrency(backendMeta.paid_total)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} />
                  <td className="px-2 py-1.5 text-right">
                    <strong>Saldo pendiente</strong>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <strong>{formatCurrency(backendMeta.balance_due)}</strong>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Firmas (solo RECIBO) */}
      {!doc.isProforma && (
        <div className="flex bg-white px-4">
          <div className="w-1/2 px-3 py-5 text-center">
            <h6 className="m-0">
              <br />
                  __________________
              <br />
              <strong>RECIBÍ CONFORME</strong>
            </h6>
          </div>
          <div className="w-1/2 px-3 py-5 text-center">
            <h6 className="m-0">
              <br />
                  ___________________
              <br />
              <strong>ENTREGUÉ CONFORME</strong>
            </h6>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-white px-4 pt-4">
        <img
          src={BRAND_ASSETS.FOOTER}
          alt="Footer Tekbo"
          className="block w-full max-w-[710px]"
          style={{ border: 0 }}
        />
      </div>
    </div>
  );
}
