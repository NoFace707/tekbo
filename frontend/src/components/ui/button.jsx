import { cn } from "../../lib/utils";

const variants = {
  default: "bg-brand-800 text-white hover:bg-brand-600 focus-visible:ring-brand-500",
  secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 focus-visible:ring-slate-300",
  ghost: "bg-transparent text-brand-800 hover:bg-brand-50 focus-visible:ring-brand-300",
  lime: "bg-lime-700 text-white hover:bg-lime-800 focus-visible:ring-lime-500",
  orange: "bg-tekbo-orange text-white hover:bg-tekbo-orangeDeep focus-visible:ring-orange-400",
};

const sizes = {
  default: "h-11 px-4 py-2",
  sm: "h-9 px-3 text-sm",
  lg: "h-12 px-5 text-sm",
};

export function Button({ className, variant = "default", size = "default", type = "button", ...props }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
        variants[variant] || variants.default,
        sizes[size] || sizes.default,
        className
      )}
      {...props}
    />
  );
}
