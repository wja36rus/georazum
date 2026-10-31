import { STORAGE_KEYS, API_BASE } from "../config";

/** Ошибка API с HTTP-статусом. status=0 — сетевой сбой. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

let onUnauthorized: (() => void) | null = null;

/** Регистрируется приложением (AuthProvider): вызывается при любом 401. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

/**
 * Обёртка над fetch для API «Гео Разум».
 * Токен берётся из localStorage, если не передан явно.
 */
export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { method = "GET", body, token, signal } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const t =
    token === undefined ? localStorage.getItem(STORAGE_KEYS.token) : token;
  if (t) headers.Authorization = "Bearer " + t;

  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "Нет соединения с сервером. Проверьте, запущен ли API (порт 4000).",
    );
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* тело отсутствует или не JSON */
  }

  if (res.status === 401) onUnauthorized?.();

  if (!res.ok) {
    const msg =
      (data as { error?: string } | null)?.error ??
      "Ошибка запроса (" + res.status + ").";
    throw new ApiError(res.status, msg);
  }

  return data as T;
}

/** Удобные обёртки. */
export const apiGet = <T>(path: string, opts?: ApiOptions) =>
  api<T>(path, { ...opts, method: "GET" });
export const apiPost = <T>(path: string, body?: unknown, opts?: ApiOptions) =>
  api<T>(path, { ...opts, method: "POST", body });
export const apiPatch = <T>(path: string, body?: unknown, opts?: ApiOptions) =>
  api<T>(path, { ...opts, method: "PATCH", body });
export const apiPut = <T>(path: string, body?: unknown, opts?: ApiOptions) =>
  api<T>(path, { ...opts, method: "PUT", body });
