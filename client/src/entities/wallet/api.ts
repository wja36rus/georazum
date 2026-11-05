import { apiGet, apiPost } from "@/shared/api/client";
import type { CardInput } from "@/shared/lib/validators";

/* ---------- Модель ---------- */

/** Операция по личному счёту: пополнение или списание за услугу. */
export type WalletTx = {
  id: string;
  type: "topup" | "debit";
  /** Сумма операции, ₽ (всегда положительное число). */
  amount: number;
  /** Остаток на счёте после операции. */
  balanceAfter: number;
  /** Заказ, за который списаны средства (только для type: "debit"). */
  orderId?: string;
  description: string;
  createdAt: string;
};

export type Wallet = {
  balance: number;
  transactions: WalletTx[];
};

/* ---------- API ---------- */

/** Текущий баланс и история операций текущего пользователя. */
export const getWallet = () => apiGet<Wallet>("/api/wallet");

/** Пополнение счёта картой. Мок-провайдер как в оплате заказа. */
export const topUpWallet = (amount: number, card: CardInput) =>
  apiPost<{ balance: number; transaction: WalletTx }>("/api/wallet/topup", {
    amount,
    card,
  });
