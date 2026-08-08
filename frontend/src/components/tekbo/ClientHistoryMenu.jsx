/**
 * ClientHistoryMenu.jsx
 *
 * Single Responsibility: render del menú desplegable tipo acordeón
 * con el historial de clientes y sus archivos.
 *
 * Recibe datos y callbacks por props; no conoce storage ni estado global
 * (Dependency Inversion: depende de la interfaz declarada en props).
 */

import { useEffect, useRef, useState } from "react";

export default function ClientHistoryMenu({
  open,
  clients,
  activeClientName,
  activeFileIndex,
  onSelectFile,
  onPrepareNewSheet,
  onDeleteClient,
  onDeleteFile,
}) {
  const [expanded, setExpanded] = useState({});
  const ref = useRef(null);

  // Cerrar todos los grupos cuando se cierra el menú principal.
  useEffect(() => {
    if (!open) setExpanded({});
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 top-[55px] z-[999] max-h-[450px] overflow-y-auto rounded-lg border border-slate-300 bg-white p-1.5 shadow-2xl"
    >
      {clients.length === 0 ? (
        <div className="px-3 py-3 text-center text-xs text-slate-500">
          Sin historial.
        </div>
      ) : (
        clients.map((client, cIndex) => {
          const isExpanded = !!expanded[cIndex];
          return (
            <div
              key={client.name}
              className="mb-1 overflow-hidden rounded-md border border-slate-100"
            >
              <div
                onClick={() =>
                  setExpanded((s) => ({ ...s, [cIndex]: !s[cIndex] }))
                }
                className="flex cursor-pointer items-center justify-between bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-brand-800 transition hover:bg-brand-50"
              >
                <span>👤 {client.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Borrar Cliente"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClient(client.name);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-transparent text-xs font-bold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50"
                  >
                    ✕
                  </button>
                  <span className="text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="bg-white">
                  {client.files.map((file, fIndex) => {
                    const isActive =
                      activeClientName === client.name &&
                      activeFileIndex === fIndex;
                    return (
                      <div
                        key={`${file.name}-${fIndex}`}
                        onClick={() => onSelectFile(client.name, fIndex)}
                        className={`flex cursor-pointer items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs transition hover:bg-slate-50 ${
                          isActive
                            ? "bg-brand-50 font-bold text-brand-800"
                            : "text-slate-700"
                        }`}
                      >
                        <span>📄 {file.name}</span>
                        <button
                          type="button"
                          title="Borrar Archivo"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFile(client.name, fIndex);
                          }}
                          className="ml-2 flex h-6 w-6 items-center justify-center rounded-full border border-transparent text-xs font-bold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  <div
                    onClick={() => onPrepareNewSheet(client.name)}
                    className="cursor-pointer border-t border-dashed border-lime-400 bg-lime-100 px-3 py-3 text-center text-xs font-bold text-lime-900 transition hover:bg-lime-200 hover:text-lime-900"
                  >
                    + NUEVA HOJA PARA {client.name.toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
