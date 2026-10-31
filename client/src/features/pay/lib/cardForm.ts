import { digits } from "@/shared/lib/format";
import type { CardInput } from "@/shared/lib/validators";

/** Группировка цифр номера карты по 4 («4111 1111 1111 1111»), максимум 16 цифр. */
export function formatCardNumber(value: string): string {
  const d = digits(value).slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** «ММ/ГГ» из цифр, максимум 4. */
export function formatExpiry(value: string): string {
  const d = digits(value).slice(0, 4);
  if (d.length <= 2) return d;
  return d.slice(0, 2) + "/" + d.slice(2);
}

/** CVV — до 3 цифр. */
export function formatCvv(value: string): string {
  return digits(value).slice(0, 3);
}

/** Заглушка-значение для демонстрации (не подставляется автоматически). */
export const EMPTY_CARD: CardInput = { number: "", expiry: "", cvv: "", holder: "" };
