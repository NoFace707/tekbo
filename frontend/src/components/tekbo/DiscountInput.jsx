/**
 * DiscountInput.jsx
 *
 * Single Responsibility: input del descuento en Bs.
 */

export default function DiscountInput({ value, onChange, readOnly = false }) {
  return (
    <div className="mb-4 max-w-[180px]">
      <label className="mb-1 block text-[11px] font-bold uppercase text-slate-600">
        Descuento (Bs)
      </label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange("descuento", e.target.value)}
        disabled={readOnly}
        className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:bg-white disabled:bg-slate-100 disabled:text-slate-500"
      />
    </div>
  );
}
