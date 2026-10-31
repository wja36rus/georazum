import { apiGet } from "@/shared/api/client";
import type { PaymentInfo } from "../order/api";

export const getPayments = () => apiGet<{ payments: PaymentInfo[] }>("/api/payments");
