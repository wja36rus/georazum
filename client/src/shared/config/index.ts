/* Глобальные константы и конфигурация клиента. */

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
