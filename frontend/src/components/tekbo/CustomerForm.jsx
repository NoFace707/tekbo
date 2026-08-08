/**
 * CustomerForm.jsx
 *
 * Single Responsibility: form grid de datos del cliente
 * (Cliente, Fecha, Dirección, Celular).
 */

export default function CustomerForm({ values, onChange }) {
  const fields = [
    { name: "cliente", label: "Cliente", type: "text", placeholder: "Nombre del Cliente" },
    { name: "fecha", label: "Fecha", type: "text", placeholder: "DD/MM/AAAA" },
    { name: "direccion", label: "Dirección", type: "text", placeholder: "" },
    { name: "celular", label: "Celular", type: "number", placeholder: "" },
  ];

  return (
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.name}>
          <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
            {f.label}
          </label>
          <input
            type={f.type}
            value={values[f.name] ?? ""}
            placeholder={f.placeholder}
            onChange={(e) => onChange(f.name, e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-brand-800 focus:bg-white"
          />
        </div>
      ))}
    </div>
  );
}
