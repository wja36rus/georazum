/** Утилиты форматирования и мелкие хелперы. */

/** Только цифры из значения. */
export const digits = (v: string | number | null | undefined): string =>
  String(v ?? "").replace(/\D+/g, "");

/** Цена в формате «4 900 ₽». */
export const fmtPrice = (n: number | null | undefined): string =>
  n == null ? "—" : n.toLocaleString("ru-RU") + " ₽";

/** Дата/время от сервера уже в читаемом виде — просто отдаём как есть. */
export const fmtTime = (s: string | null | undefined): string => s || "—";

/** Склейка className-значений. */
export const cn = (...xs: Array<string | false | null | undefined>): string =>
  xs.filter(Boolean).join(" ");

/** Номер телефона для ссылки tel: (с кодом страны). */
export const phoneHref = (phone: string): string => "tel:+" + digits(phone);

/** Первая буква в верхнем регистре. */
export const upperFirst = (s: string): string =>
  s.length ? s[0].toUpperCase() + s.slice(1) : s;

/** Инициалы: «Иван Иванов» -> «ИИ». */
export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
