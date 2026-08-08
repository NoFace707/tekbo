import { useEffect, useMemo, useState } from "react";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../lib/utils";
import { getDocument, listDocuments } from "../services/salesService";
import { DOCUMENT_STATE_LABEL, STATE_COLOR } from "../services/tekbo";

const money = (value) =>
  `${Number(value || 0).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Bs`;

export default function SalesDocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [seller, setSeller] = useState("");
  const [state, setState] = useState("");

  const loadDocuments = async () => {
    setLoading(true);
    setError("");
    try {
      setDocuments(await listDocuments());
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar los documentos."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const sellers = useMemo(() => {
    const unique = new Map();
    documents.forEach((doc) =>
      unique.set(String(doc.vendedor), {
        id: String(doc.vendedor),
        name: doc.vendedor_name,
      })
    );
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [documents]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((doc) => {
      if (seller && String(doc.vendedor) !== seller) return false;
      if (state && doc.state !== state) return false;
      if (!query) return true;
      return [doc.code, doc.cliente, doc.vendedor_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [documents, search, seller, state]);

  const selectDocument = async (id) => {
    setDetailLoading(true);
    setError("");
    try {
      setSelected(await getDocument(id));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo abrir el documento."));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <MainLayout title="Documentos de ventas" subtitle="Consulta por vendedor">
      <section className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.5fr)]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-800">Documentos guardados</h2>
                <p className="mt-1 text-xs text-slate-500">{filtered.length} resultados</p>
              </div>
              <button onClick={loadDocuments} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">
                Actualizar
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Código, cliente o vendedor" className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-800" />
              <div className="grid grid-cols-2 gap-2">
                <select value={seller} onChange={(event) => setSeller(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs">
                  <option value="">Todos los vendedores</option>
                  {sellers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select value={state} onChange={(event) => setState(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs">
                  <option value="">Todos los estados</option>
                  {Object.entries(DOCUMENT_STATE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-3 max-h-[620px] overflow-y-auto rounded-xl border border-slate-100">
              {loading ? (
                <p className="p-6 text-center text-xs text-slate-500">Cargando documentos…</p>
              ) : filtered.length === 0 ? (
                <p className="p-6 text-center text-xs text-slate-500">No hay documentos con esos filtros.</p>
              ) : filtered.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} active={selected?.id === doc.id} onClick={() => selectDocument(doc.id)} />
              ))}
            </div>
          </aside>

          <div className="min-w-0">
            {detailLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Cargando detalle…</div>
            ) : selected ? (
              <DocumentDetail document={selected} />
            ) : (
              <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                Selecciona un documento para consultar sus productos, cobros y totales.
              </div>
            )}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}

function DocumentRow({ doc, active, onClick }) {
  const color = STATE_COLOR[doc.state] || STATE_COLOR.proforma;
  return (
    <button type="button" onClick={onClick} className={`w-full border-b border-slate-100 p-3 text-left last:border-0 ${active ? "bg-brand-50" : "hover:bg-slate-50"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800">{doc.cliente}</p>
          <p className="truncate text-xs text-slate-500">{doc.vendedor_name}</p>
          <p className="mt-1 font-mono text-[10px] text-slate-500">{doc.code} · {doc.fecha}</p>
        </div>
        <div className="shrink-0 text-right">
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${color.border} ${color.bg} ${color.text}`}>{DOCUMENT_STATE_LABEL[doc.state] || doc.state}</span>
          <p className="mt-1 text-xs font-bold text-slate-700">{money(doc.total)}</p>
        </div>
      </div>
    </button>
  );
}

function DocumentDetail({ document }) {
  const activePayments = (document.cash_entries || []).filter((entry) => !entry.is_revoked);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-800">{document.state_display}</p>
          <h2 className="mt-1 font-display text-xl font-black text-slate-900">{document.code}</h2>
          <p className="mt-1 text-sm text-slate-600">Vendedor: <strong>{document.vendedor_name}</strong></p>
        </div>
        <button onClick={() => window.print()} className="rounded-lg bg-brand-800 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 print:hidden">Imprimir</button>
      </div>

      <dl className="grid gap-3 border-b border-slate-200 py-4 sm:grid-cols-2">
        <Info label="Cliente" value={document.cliente} />
        <Info label="Fecha" value={document.fecha} />
        <Info label="Dirección" value={document.direccion || "—"} />
        <Info label="Celular" value={document.celular || "—"} />
      </dl>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500"><th className="py-2">Producto</th><th className="py-2 text-right">Cant.</th><th className="py-2 text-right">P. unitario</th><th className="py-2 text-right">Total</th></tr></thead>
          <tbody>{(document.items || []).map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="py-2.5 font-medium text-slate-800">{item.desc}</td><td className="py-2.5 text-right">{item.qty}</td><td className="py-2.5 text-right">{money(item.price)}</td><td className="py-2.5 text-right font-bold">{money(item.total)}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="ml-auto mt-4 max-w-sm space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
        <Total label="Subtotal" value={money(document.subtotal)} />
        <Total label="Descuento" value={`− ${money(document.descuento)}`} />
        <Total label="Total" value={money(document.total)} strong />
        <Total label="Pagado" value={money(document.paid_total)} />
        <Total label="Saldo pendiente" value={money(document.balance_due)} strong />
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Movimientos de caja</h3>
        {activePayments.length ? <div className="mt-2 space-y-2">{activePayments.map((entry) => <div key={entry.id} className="flex justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"><span>{entry.kind === "anticipo" ? "Anticipo" : "Liquidación"}{entry.note ? ` · ${entry.note}` : ""}</span><strong>{money(entry.amount)}</strong></div>)}</div> : <p className="mt-2 text-sm text-slate-500">Sin cobros vigentes.</p>}
      </div>
    </article>
  );
}

function Info({ label, value }) { return <div><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</dt><dd className="mt-1 text-sm text-slate-800">{value}</dd></div>; }
function Total({ label, value, strong = false }) { return <div className={`flex justify-between ${strong ? "font-black text-slate-900" : "text-slate-600"}`}><span>{label}</span><span>{value}</span></div>; }
