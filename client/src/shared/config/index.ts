/* Глобальные константы и конфигурация клиента. */

/**
 * Базовый адрес API. Значение подставляется на сборке из env (DefinePlugin):
 * пустая строка — тот же origin (dev-прокси `/api` → 4000).
 */
export const API_BASE = process.env.API_URL ?? "";

/**
 * Базовый путь развёртывания (подпапка GitHub Pages). Значение подставляется
 * на сборке из env (DefinePlugin): пустая строка — корень домена (локальная
 * разработка), "/georazum" — GitHub Pages. Нормализован: без завершающего слеша.
 */
export const BASE_PATH = (process.env.BASE_PATH ?? "").replace(/\/+$/, "");

export const API_PREFIX = "/api";

export const STORAGE_KEYS = {
  token: "gr_token",
  user: "gr_user",
} as const;

/** Тестовая карта, по которой мок-провайдер отклоняет платёж (HTTP 402). */
export const REFUSE_CARD = "0000000000000000";

export const CONTACTS = {
  email: "support@georazum.ru",
  phone: "+7 (473) 229-00-00",
  phoneRaw: "+74732290000",
  address: "394000, г. Воронеж, ул. Средне-Московская, 12, офис 305",
  company: "ООО «Гео Разум»",
  inn: "ИНН 3662541110, ОГРН 1213600024044",
};

/** Примерные кадастровые номера для быстрых проверок на главной. */
export const DEMO_CADASTRALS = [
  "36:16:3405742:189",
  "36:25:6945030:776",
  "36:34:1823050:441",
];
