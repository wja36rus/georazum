import { afterEach, describe, expect, it, vi } from "vitest";
import { mockFetch, type MockInit } from "./handlers";

/*
 * Smoke-тест мок-режима (статический хостинг без бэкенда):
 * авторизация → заказ → оплата (успех/отказ) → генерация → отчёт.
 * Состояние в памяти: между тестами накапливается (как in-memory БД сервера).
 */

const authHeaders = (token: string) => ({ Authorization: "Bearer " + token });

async function loginDemo(): Promise<{
  token: string;
  headers: Record<string, string>;
}> {
  const res = await mockFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ivan@mail.ru", password: "demo1234" }),
  });
  const { token } = res.data as { token: string };
  return { token, headers: authHeaders(token) };
}

describe("mock API (демо без бэкенда)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("логин демо-пользователя и профиль через токен", async () => {
    const { token, headers } = await loginDemo();

    const me = await mockFetch("/api/auth/me", { headers });
    expect(me.status).toBe(200);
    expect((me.data as { user: { name: string } }).user.name).toBe(
      "Иван Иванов",
    );
    expect(token).toMatch(/^mock-tok-/);
  });

  it("401 без токена / неверный пароль", async () => {
    const noAuth = await mockFetch("/api/auth/me");
    expect(noAuth.status).toBe(401);

    const bad = await mockFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ivan@mail.ru", password: "wrong" }),
    });
    expect(bad.status).toBe(401);
  });

  it("публичные данные: уровни, оферта, документы", async () => {
    const levels = await mockFetch("/api/levels");
    expect(levels.status).toBe(200);
    expect(
      (levels.data as { levels: { id: string }[] }).levels.map((l) => l.id),
    ).toEqual(["s", "m", "l"]);

    const offer = await mockFetch("/api/offer");
    expect((offer.data as { offer: { version: string } }).offer.version).toBe(
      "1.0",
    );
  });

  it("участок: без авторизации — 401", async () => {
    const noAuth = await mockFetch("/api/parcels/36:16:3405742:189");
    expect(noAuth.status).toBe(401);
    const badToken = await mockFetch("/api/parcels/999", {
      headers: { Authorization: "Bearer not-a-token" },
    });
    expect(badToken.status).toBe(401);
  });

  it("полный цикл: заказ → оплата → генерация → отчёт", async () => {
    // Логинимся на реальных таймерах, дальше контролируем время вручную.
    const { headers } = await loginDemo();
    vi.useFakeTimers();

    // Обёртка: каждая мок-ручка имитирует сетевую задержку — сдвигаем таймеры.
    const call = async (path: string, init: MockInit = {}) => {
      const promise = mockFetch(path, init);
      await vi.advanceTimersByTimeAsync(400);
      return promise;
    };

    // Параметр участка
    const parcel = await call("/api/parcels/36:16:3405742:189", { headers });
    expect(parcel.status).toBe(200);

    // Создание заказа уровня S
    const created = await call("/api/orders", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        cadastral: "36:16:3405742:189",
        level: "s",
        offerAccepted: true,
        offerVersion: "1.0",
      }),
    });
    expect(created.status).toBe(201);
    const orderId = (created.data as { order: { id: string } }).order.id;
    expect((created.data as { order: { status: string } }).order.status).toBe(
      "Ожидает оплаты",
    );

    // Оплата картой-отказом → 402
    const refusedCard = {
      number: "0000 0000 0000 0000",
      expiry: "12/30",
      cvv: "123",
      holder: "IVAN IVANOV",
    };
    const refused = await call("/api/orders/" + orderId + "/pay", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ card: refusedCard }),
    });
    expect(refused.status).toBe(402);

    // Успешная оплата → генерация стартует
    const paid = await call("/api/orders/" + orderId + "/pay", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        card: {
          number: "4111 1111 1111 1111",
          expiry: "12/30",
          cvv: "123",
          holder: "IVAN IVANOV",
        },
      }),
    });
    expect(paid.status).toBe(200);
    // Как и на сервере: startGeneration() сразу переводит заказ в обработку.
    expect((paid.data as { order: { status: string } }).order.status).toBe(
      "Передан в обработку",
    );

    // Промежуточный статус генерации
    await vi.advanceTimersByTimeAsync(2000);
    const mid = await call("/api/orders/" + orderId, { headers });
    const midStatus = (mid.data as { order: { status: string } }).order.status;
    expect([
      "Передан в обработку",
      "Сбор исходных данных",
      "Выполняется анализ",
    ]).toContain(midStatus);

    // Ждём финал → Готово + отчёт
    await vi.advanceTimersByTimeAsync(4000);
    const done = await call("/api/orders/" + orderId, { headers });
    expect((done.data as { order: { status: string } }).order.status).toBe(
      "Готово",
    );

    const report = await call("/api/orders/" + orderId + "/report", {
      headers,
    });
    expect(report.status).toBe(200);
    const sections = (report.data as { report: { sections: string[] } }).report
      .sections;
    expect(sections.length).toBeGreaterThan(5);
  });
});
