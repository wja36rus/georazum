import { apiGet } from "@/shared/api/client";

export type ReportSection = {
  title: string;
  body: string[];
};

export type Report = {
  id: string;
  orderId: string;
  cadastral: string;
  level: string;
  title: string;
  generatedAt: string;
  summary: {
    address: string;
    area: string;
    level: string;
    price: number;
  };
  sections: ReportSection[];
};

/** Отчёт по заказу (собирается на сервере лениво). */
export const getReport = (orderId: string) =>
  apiGet<{ report: Report }>("/api/orders/" + encodeURIComponent(orderId) + "/report");

/** Публичный демо-отчёт уровня L для страницы «Примеры». */
export const getExampleReport = () => apiGet<{ report: Report }>("/api/examples/report");
