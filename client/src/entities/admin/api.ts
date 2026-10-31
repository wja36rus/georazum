import { apiGet, apiPatch, apiPut } from "@/shared/api/client";
import type { AdminUser } from "../user/api";
import type { OrderSummary, OrderStatus } from "../order/api";
import type { Level } from "../level/api";
import type { Offer } from "../offer/api";

export type AdminStats = {
  users: number;
  orders: number;
  byLevel: { s: number; m: number; l: number };
  paidSum: number;
  completed: number;
  errors: number;
  avgGenerationSeconds: number;
  activeGenerations: number;
  conversion: number;
};

export type AdminOrder = OrderSummary & {
  userId: string;
  userName: string;
  userEmail: string;
  statusHistory: { status: OrderStatus; at: string }[];
  params: Record<string, string>;
};

export type GenerationJob = {
  id: string;
  orderId: string;
  level: string;
  attempts: number;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number | null;
};

export const getAdminStats = () => apiGet<{ stats: AdminStats }>("/api/admin/stats");

export const getAdminUsers = (q = "") =>
  apiGet<{ users: AdminUser[] }>("/api/admin/users" + (q ? "?q=" + encodeURIComponent(q) : ""));

export const blockUser = (id: string, blocked: boolean) =>
  apiPatch<{ user: AdminUser }>("/api/admin/users/" + encodeURIComponent(id) + "/block", { blocked });

export const getUserOrders = (id: string) =>
  apiGet<{ orders: OrderSummary[] }>("/api/admin/users/" + encodeURIComponent(id) + "/orders");

export const getAdminOrders = (filters: { q?: string; level?: string; status?: string } = {}) => {
  const qs = new URLSearchParams();
  if (filters.q) qs.set("q", filters.q);
  if (filters.level) qs.set("level", filters.level);
  if (filters.status) qs.set("status", filters.status);
  const q = qs.toString();
  return apiGet<{ orders: AdminOrder[]; statuses: OrderStatus[] }>("/api/admin/orders" + (q ? "?" + q : ""));
};

export const setOrderStatus = (id: string, status: OrderStatus) =>
  apiPatch<{ order: OrderSummary }>("/api/admin/orders/" + encodeURIComponent(id) + "/status", { status });

export const getGenerations = () => apiGet<{ generations: GenerationJob[] }>("/api/admin/generations");

export const updateLevel = (id: string, patch: { price?: number; duration?: string; tagline?: string; available?: boolean }) =>
  apiPatch<{ levels: Level[] }>("/api/admin/levels/" + encodeURIComponent(id), patch);

export const updateOffer = (version: string, text: string[]) =>
  apiPut<{ offer: Offer }>("/api/admin/offer", { version, text });
