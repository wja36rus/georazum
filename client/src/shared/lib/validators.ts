import { digits } from "./format";

/** Формат кадастрового номера: XX:XX:XXXXXXX:XXX (повторяет правило сервера). */
export const CADASTRAL_RE = /^\d{2}:\d{2}:\d{7}:\d{3}$/;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Имя/фамилия: буквы (кириллица/латиница) и дефис, от 2 символов. */
export const NAME_RE = /^[А-ЯЁа-яёA-Za-z-]{2,}$/;

export const isCadastral = (v: string): boolean => CADASTRAL_RE.test(v.trim());

export const isEmail = (v: string): boolean => EMAIL_RE.test(v.trim());

export const isPhone = (v: string): boolean => digits(v).length === 11;

export const isStrongPassword = (v: string): boolean => v.length >= 8;

export type CardInput = {
  number: string;
  expiry: string;
  cvv: string;
  holder: string;
};

/**
 * Валидация данных карты — зеркало cardValid() на сервере.
 * Возвращает текст ошибки или пустую строку.
 */
export function cardError(card: CardInput): string {
  const number = digits(card.number);
  if (number.length !== 16) return "Номер карты должен содержать 16 цифр.";

  const exp = digits(card.expiry);
  if (exp.length !== 4) return "Срок действия карты — формат ММ/ГГ.";

  const month = Number(exp.slice(0, 2));
  const year = 2000 + Number(exp.slice(2));
  const d = new Date();
  if (month < 1 || month > 12) return "Некорректный месяц срока действия.";
  if (year < d.getFullYear() || (year === d.getFullYear() && month < d.getMonth() + 1))
    return "Срок действия карты истёк.";

  if (digits(card.cvv).length !== 3) return "CVV должен содержать 3 цифры.";
  if (card.holder.trim().length < 3) return "Укажите имя владельца карты.";

  return "";
}

/** Валидация формы заказа (кадастровый номер). */
export function orderError(cadastral: string, offerAccepted: boolean, offerVersion: string): string {
  if (!isCadastral(cadastral)) return "Кадастровый номер должен быть в формате XX:XX:XXXXXXX:XXX.";
  if (!offerAccepted) return "Необходимо принять условия публичной оферты.";
  if (!offerVersion) return "Не получена версия оферты. Перезагрузите страницу.";
  return "";
}
