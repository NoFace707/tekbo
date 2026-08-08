/**
 * MagicAssistant.jsx
 *
 * Single Responsibility: input del "Asistente Rápido".
 * Recibe el valor y emite el comando raw al controlador, que lo delega
 * al servicio tekboMagicInputService.
 */

import { useState } from "react";

export default function MagicAssistant({ onApply, disabled }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onApply(value);
    setValue("");
  };

  return (
    <div className="mb-6 rounded-xl border-2 border-lime-600 bg-lime-100 p-4">
      <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-wide text-lime-900">
        ✨ Asistente Rápido
      </label>
      <form onSubmit={handleSubmit} className="flex gap-2.5">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='Ej: "Cliente Ana" o "2 Pantallas a 500"'
          disabled={disabled}
          className="flex-1 rounded-md border border-lime-400 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800"
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded-md bg-lime-700 px-4 text-lg font-extrabold text-white transition hover:bg-lime-800"
        >
          ⚡
        </button>
      </form>
    </div>
  );
}
