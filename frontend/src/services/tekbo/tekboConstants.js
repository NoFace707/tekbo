/**
 * tekboConstants.js
 *
 * Constantes de dominio del Generador Tekbo.
 * Single Responsibility: definición de valores invariantes del módulo.
 *
 * Mantener las constantes en un único lugar facilita el cambio sin tocar
 * lógica de negocio ni componentes de UI (Open/Closed Principle).
 */

// Tipo de documento generado por el panel.
export const DOCUMENT_TYPE = {
  RECIBO: "RECIBO",
  PROFORMA: "PROFORMA",
};

// Límite físico de filas impresas en el recibo/proforma.
export const MAX_ITEM_ROWS = 7;

// Claves de localStorage usadas por el storage service.
// Centralizarlas evita colisiones y permite cambiar el namespace en un solo punto.
export const STORAGE_KEYS = {
  DB: "tekbo_db_v17",
  TEMP: "tekbo_temp_v17",
};

// Intervalo de autoguardado (ms) — coincide con el HTML original.
export const AUTOSAVE_INTERVAL_MS = 10000;

// Etiquetas visuales reutilizables.
export const LABELS = {
  PANEL_TITLE: "PANEL TEKBO",
  PANEL_VERSION: "V17 Gestión Total",
  MENU_TRIGGER_DEFAULT: "📂 Historial de Clientes...",
  BUTTON_SAVE: "GUARDAR",
  BUTTON_UPDATE: "ACTUALIZAR",
  BUTTON_SAVE_NEW: "GUARDAR NUEVO",
  TOGGLE_TO_PROFORMA: "CAMBIAR A PROFORMA",
  TOGGLE_TO_RECIBO: "CAMBIAR A RECIBO",
  ADD_ITEM: "+ AGREGAR ÍTEM",
  PRINT_PDF: "IMPRIMIR / PDF",
};

// URL del logo institucional (mantenemos el del HTML original).
export const BRAND_ASSETS = {
  LOGO:
    "https://80640b539a.imgdist.com/pub/bfra/0lxfvecp/nw5/z4i/rix/logo.jpg",
  AD:
    "https://80640b539a.imgdist.com/pub/bfra/0lxfvecp/cn8/n12/w1q/ada.jpg",
  FOOTER:
    "https://80640b539a.imgdist.com/pub/bfra/0lxfvecp/a6b/xlf/98m/ala1.jpg",
};

// Configuración de locale para formateo.
export const LOCALE = "es-BO";
export const CURRENCY_SUFFIX = "Bs";
