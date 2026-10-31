import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, setUnauthorizedHandler } from "./client";
import { STORAGE_KEYS } from "../config";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const fetchMock = vi.fn();

afterEach(() => {
  fetchMock.mockReset();
  setUnauthorizedHandler(null);
});

describe("api", () => {
  it("добавляет Bearer-токен из localStorage и разбирает JSON", async () => {
    localStorage.setItem(STORAGE_KEYS.token, "secret-token");
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const out = await api<{ ok: boolean }>("/api/health");
    expect(out.ok).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/health");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret-token");
    expect(init.method).toBe("GET");
  });

  it("отправляет JSON-тело и метод", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await api("/api/orders", { method: "POST", body: { a: 1 } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/orders");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("бросает ApiError с сообщением сервера", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Участок не найден." }, 404));
    vi.stubGlobal("fetch", fetchMock);

    const err = await api("/api/parcels/123").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).message).toBe("Участок не найден.");
  });

  it("вызывает обработчик 401", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(jsonResponse({ error: "Требуется авторизация." }, 401));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api("/api/auth/me")).rejects.toThrow("Требуется авторизация");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("сетевой сбой → ApiError со статусом 0", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const err = await api("/api/health").catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(0);
    expect((err as ApiError).message).toContain("Нет соединения");
  });

  it("без токена заголовок Authorization отсутствует", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await api("/api/health");
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
