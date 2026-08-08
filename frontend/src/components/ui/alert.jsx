import { cn } from "../../lib/utils";

const tones = {
  default: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-lime-300 bg-lime-100 text-lime-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
  brand: "border-brand-200 bg-brand-50 text-brand-800",
};

export function Alert({ className, tone = "default", onClose, children, ...props }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm",
        tones[tone] || tones.default,
        className
      )}
      {...props}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md px-1 text-current/70 hover:text-current"
          aria-label="Cerrar"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function AlertTitle({ className, ...props }) {
  return <p className={cn("font-bold", className)} {...props} />;
}

export function AlertDescription({ className, ...props }) {
  return <div className={cn("mt-1 text-sm leading-6", className)} {...props} />;
}
