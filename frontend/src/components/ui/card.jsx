import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return <section className={cn("rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("space-y-2 p-6 sm:p-8", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h1 className={cn("text-2xl font-black tracking-tight text-slate-950 sm:text-3xl", className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("text-sm leading-6 text-slate-600", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("px-6 pb-6 sm:px-8 sm:pb-8", className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return <div className={cn("flex items-center px-6 pb-6 sm:px-8 sm:pb-8", className)} {...props} />;
}