import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ID único para chaves React / estado local.
 * Em páginas servidas por HTTP (ex.: rede local), `crypto.randomUUID` pode não existir — usa fallback.
 */
export function randomClientId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined
  if (c && typeof c.randomUUID === "function") {
    try {
      return c.randomUUID()
    } catch {
      /* ignora */
    }
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}-${Math.random().toString(36).slice(2, 11)}`
}
