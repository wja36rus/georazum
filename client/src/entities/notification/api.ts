import { apiGet, apiPost } from "@/shared/api/client";

export type NotificationType =
  "order" | "payment" | "account" | "email" | "lead" | "system";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  text: string;
  createdAt: string;
  read: boolean;
};

export const getNotifications = () =>
  apiGet<{ notifications: Notification[] }>("/api/notifications");

/** Отметить прочитанными: все (id=undefined) или одно конкретное. */
export const markNotificationsRead = (id?: string) =>
  apiPost<{ ok: boolean }>("/api/notifications/read", id ? { id } : {});
