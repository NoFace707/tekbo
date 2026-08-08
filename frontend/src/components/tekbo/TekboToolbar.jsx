/**
 * TekboToolbar.jsx
 *
 * Single Responsibility: barra de herramientas superior del panel.
 * Contiene botón limpiar, trigger del menú de historial, botón borrar
 * (si hay documento del backend) y botón guardar.
 */

import { useEffect, useRef } from "react";
import ClientHistoryMenu from "./ClientHistoryMenu";

export default function TekboToolbar({
  menuLabel,
  saveLabel,
  menuOpen,
  onToggleMenu,
  onResetForm,
  onSave,
  onDelete,
  canDelete,
  saveDisabled,
  clients,
  activeClientName,
  activeFileIndex,
  onSelectFile,
  onPrepareNewSheet,
  onDeleteClient,
  onDeleteFile,
}) {
  const containerRef = useRef(null);

  // Cerrar el menú al hacer click fuera.
  useEffect(() => {
    function handleClickOutside(e) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        onToggleMenu(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, onToggleMenu]);

  return (
    <div
      ref={containerRef}
      className="relative z-[100] mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
    >
      <button
        type="button"
        onClick={onResetForm}
        title="Nueva Hoja"
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-lg text-tekbo-orangeDeep transition hover:bg-amber-100"
      >
        🧹
      </button>

      <button
        type="button"
        onClick={() => onToggleMenu(!menuOpen)}
        className="flex h-11 min-w-[180px] flex-1 items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-brand-800"
      >
        <span className="truncate">{menuLabel}</span>
        <span className="ml-2 text-[10px]">{menuOpen ? "▲" : "▼"}</span>
      </button>

      <ClientHistoryMenu
        open={menuOpen}
        clients={clients}
        activeClientName={activeClientName}
        activeFileIndex={activeFileIndex}
        onSelectFile={onSelectFile}
        onPrepareNewSheet={onPrepareNewSheet}
        onDeleteClient={onDeleteClient}
        onDeleteFile={onDeleteFile}
      />

      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Borrar documento del backend"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-tekbo-orangeDeep transition hover:bg-rose-100"
        >
          🗑
        </button>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={saveDisabled}
        className="flex h-11 items-center gap-1.5 rounded-lg bg-brand-800 px-4 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        💾 <span>{saveLabel}</span>
      </button>
    </div>
  );
}
