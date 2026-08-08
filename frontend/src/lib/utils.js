import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  const firstErrorField = Object.keys(data)[0];
  if (!firstErrorField) return fallback;

  const firstError = data[firstErrorField];
  if (Array.isArray(firstError) && firstError[0]) return `${firstErrorField}: ${firstError[0]}`;
  if (typeof firstError === "string") return `${firstErrorField}: ${firstError}`;
  return fallback;
}