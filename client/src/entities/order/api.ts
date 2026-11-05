import { apiGet, apiPost } from "@/shared/api/client";
import type { Parcel } from "../parcel/api";
import type { CardInput } from "@/shared/lib/validators";

/* ---------- Модель ---------- */

export const ORDER_STATUSES = [
  "Заказ создан",
  "Ожидает оплаты",
  "Оплачен",
  "Передан в обработку",
  "Сбор исходных данных",
  "Выполняется анализ",
  "Формируется PDF",
  "Готово",
  "Ошибка генерации",
  "Требуется вмешательство специалиста",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Статусы, в которых идёт генерация отчёта. */
export const ACTIVE_GENERATION_STATUSES: OrderStatus[] = [
  "Оплачен",
  "Передан в обработку",
  "Сбор исходных данных",
  "Выполняется анализ",
  "Формируется PDF",
];

/** Финал без отчёта: нужен ретрай. */
export const FAILED_STATUSES: OrderStatus[] = [
  "Ошибка генерации",
  "Требуется вмешательство специалиста",
];

export const TERMINAL_STATUSES: OrderStatus[] = ["Готово", ...FAILED_STATUSES];

export const isActiveGeneration = (s: string): boolean =>
  (ACTIVE_GENERATION_STATUSES as string[]).includes(s);

export const isFinished = (s: string): boolean =>
  (TERMINAL_STATUSES as string[]).includes(s);

export const isFailed = (s: string): boolean =>
  (FAILED_STATUSES as string[]).includes(s);

export const isPaid = (s: string): boolean =>
  s !== "Заказ создан" && s !== "Ожидает оплаты";

/** Порядковый номер статуса в жизненном цикле (для прогресса). */
export const statusIndex = (s: string): number => {
  const i = ORDER_STATUSES.indexOf(s as OrderStatus);
  return i === -1 ? 0 : i;
};

/* ---------- Типы ---------- */

export type OfferAccept = {
  version: string;
  acceptedAt: string;
};

/** Данные заказчика (шаги 4–5 User Journey). */
export type CustomerInfo = {
  type: "person" | "ip" | "company";
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  inn?: string;
  ogrnip?: string;
  companyName?: string;
  innCompany?: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  representative?: string;
  position?: string;
};

export type OrderSummary = {
  id: string;
  cadastral: string;
  /** Количество участков в заказе (1+). */
  parcelCount?: number;
  level: string;
  levelName: string;
  price: number;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  reportId: string | null;
};

export type StatusHistoryEntry = {
  status: OrderStatus;
  at: string;
};

export type PaymentInfo = {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  transactionId: string;
};

export type OrderFull = OrderSummary & {
  parcel: Parcel;
  /** Все участки заказа (п. 2.1 User Journey). */
  parcels?: Parcel[];
  customer?: CustomerInfo | null;
  params: Record<string, string>;
  offer: OfferAccept;
  statusHistory: StatusHistoryEntry[];
  transactionId: string | null;
  generationAttempts: number;
  payment: PaymentInfo | null;
};

export type CreateOrderPayload = {
  /** Кадастровые номера (1+). */
  cadastrals: string[];
  /** Первый номер — для обратной совместимости с сервером (одиночный заказ). */
  cadastral?: string;
  level: string;
  offerAccepted: boolean;
  offerVersion: string;
  customer?: CustomerInfo;
  params?: Record<string, string>;
};

export type PayResult = {
  order: OrderFull;
  payment: PaymentInfo;
  /** Новый остаток на счёте (при оплате с личного счёта). */
  balance?: number;
};

/** Способ оплаты: картой или с личного счёта. */
export type PayPayload = { card: CardInput } | { fromBalance: true };

/* ---------- API ---------- */

export const createOrder = (payload: CreateOrderPayload) =>
  apiPost<{ order: OrderFull }>("/api/orders", payload);

export const getOrders = () =>
  apiGet<{ orders: OrderSummary[] }>("/api/orders");

export const getOrder = (id: string) =>
  apiGet<{ order: OrderFull }>("/api/orders/" + encodeURIComponent(id));

export const payOrder = (id: string, payload: PayPayload) =>
  apiPost<PayResult>("/api/orders/" + encodeURIComponent(id) + "/pay", payload);

export const retryOrder = (id: string) =>
  apiPost<{ order: OrderFull }>(
    "/api/orders/" + encodeURIComponent(id) + "/retry",
  );

export const resendReport = (id: string) =>
  apiPost<{ ok: boolean; to: string }>(
    "/api/orders/" + encodeURIComponent(id) + "/resend-report",
  );
