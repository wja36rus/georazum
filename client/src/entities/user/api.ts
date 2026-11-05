import { apiGet, apiPatch, apiPost } from "@/shared/api/client";

export type UserRole = "user" | "admin";

/** Пользователь в ответах API (publicUser). */
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  confirmed: boolean;
  blocked: boolean;
  createdAt: string;
};

export type AdminUser = User & {
  ordersCount: number;
  deleteRequestedAt: string | null;
  /** Текущий остаток на личном счёте, ₽. */
  balance: number;
};

export type LoginResult = {
  token: string;
  user: User;
};

export const login = (email: string, password: string) =>
  apiPost<LoginResult>("/api/auth/login", { email, password });

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  consentPd: boolean;
  consentTerms: boolean;
};

export const register = (payload: RegisterPayload) =>
  apiPost<LoginResult>("/api/auth/register", payload);

export const logout = () => apiPost<{ ok: boolean }>("/api/auth/logout");

export const getMe = () => apiGet<{ user: User }>("/api/auth/me");

export const updateProfile = (patch: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}) => apiPatch<{ user: User }>("/api/auth/profile", patch);

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiPatch<{ ok: boolean; token: string }>("/api/auth/password", {
    currentPassword,
    newPassword,
  });

export const recovery = (email: string) =>
  apiPost<{ ok: boolean; message: string }>("/api/auth/recovery", { email });

export const deleteRequest = (password: string) =>
  apiPost<{ ok: boolean; message: string }>("/api/auth/delete-request", {
    password,
  });
