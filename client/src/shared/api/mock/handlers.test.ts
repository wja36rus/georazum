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

  it("взаимное расположение: смежные и несмежные участки", async () => {
    // Логинимся на реальных таймерах, дальше контролируем время вручную.
    const { headers } = await loginDemo();
    vi.useFakeTimers();
    const call = async (path: string, init: MockInit = {}) => {
      const promise = mockFetch(path, init);
      await vi.advanceTimersByTimeAsync(400);
      return promise;
    };

    // Смежные участки (189 + 190): всё примыкает друг к другу.
    const adjacent = await call("/api/parcels/mutual", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        cadastrals: ["36:16:3405742:189", "36:16:3405742:190"],
      }),
    });
    expect(adjacent.status).toBe(200);
    const adjData = adjacent.data as {
      totalArea: string;
      count: number;
      allAdjacent: boolean;
      pairs: { a: string; b: string; adjacent: boolean }[];
    };
    expect(adjData.allAdjacent).toBe(true);
    expect(adjData.count).toBe(2);
    expect(adjData.pairs[0].adjacent).toBe(true);
    expect(adjData.totalArea).toMatch(/м²/);

    // Несмежные участки: 189 (район микрорайона) и 776 (другой городской район)
    // не граничат — расстояние по мок-данным 12.4 км.
    const far = await call("/api/parcels/mutual", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        cadastrals: ["36:16:3405742:189", "36:25:6945030:776"],
      }),
    });
    expect(far.status).toBe(200);
    const farData = far.data as {
      allAdjacent: boolean;
      pairs: { a: string; b: string; adjacent: boolean; distance: string }[];
    };
    expect(farData.allAdjacent).toBe(false);
    expect(farData.pairs[0].adjacent).toBe(false);
    expect(farData.pairs[0].distance).toMatch(/км|м/);
  });

  it("многоучастковый заказ: кадастры массивом + данные заказчика", async () => {
    // Логинимся на реальных таймерах, дальше контролируем время вручную.
    const { headers } = await loginDemo();
    vi.useFakeTimers();
    const call = async (path: string, init: MockInit = {}) => {
      const promise = mockFetch(path, init);
      await vi.advanceTimersByTimeAsync(400);
      return promise;
    };

    const created = await call("/api/orders", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        cadastrals: ["36:16:3405742:189", "36:16:3405742:190"],
        level: "m",
        offerAccepted: true,
        offerVersion: "1.0",
        customer: {
          type: "ip",
          lastName: "Иванов",
          firstName: "Иван",
          inn: "123456789012",
          ogrnip: "123456789012345",
          email: "ivan@mail.ru",
        },
        params: { l_direction: "build" },
      }),
    });
    expect(created.status).toBe(201);
    const order = (
      created.data as {
        order: {
          id: string;
          parcels: { cadastral: string; areaSqm: number }[];
          parcelCount: number;
          customer: { type: string; email: string } | null;
        };
      }
    ).order;
    expect(order.parcels).toHaveLength(2);
    expect(order.parcels.map((p) => p.cadastral)).toEqual([
      "36:16:3405742:189",
      "36:16:3405742:190",
    ]);
    expect(order.parcelCount).toBe(2);
    expect(order.customer?.type).toBe("ip");

    const orderId = order.id;
    const full = await call("/api/orders/" + orderId, { headers });
    expect(full.status).toBe(200);
    const fullOrder = (
      full.data as { order: { parcels: { cadastral: string }[] } }
    ).order;
    expect(fullOrder.parcels).toHaveLength(2);
  });
});
