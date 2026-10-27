"use strict";

/* Проверка REST API: node test.js — стартует приложение и гоняет все эндпоинты. */
const assert = require("assert");
const app = require("./app.js");

const server = app.listen(0);
const port = server.address().port;
const base = "http://127.0.0.1:" + port;

/** fetch-обёртка с JSON-телом и токеном. */
async function call(method, path, body, token) {
  const res = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    /* пустое тело */
  }
  return { status: res.status, data };
}

(async () => {
  try {
    /* Каталог */
    const tariffs = await call("GET", "/api/tariffs");
    assert.strictEqual(tariffs.status, 200);
    assert.strictEqual(tariffs.data.tariffs.length, 5);
    assert.strictEqual(
      tariffs.data.tariffs.find((t) => t.id === "investor").price,
      6990,
    );

    const modules = await call("GET", "/api/modules");
    assert.strictEqual(modules.data.modules.length, 3);

    /* Поиск участка */
    const found = await call("POST", "/api/parcels/search", {
      query: "36:25:6945030:776",
    });
    assert.strictEqual(found.status, 200);
    assert.strictEqual(found.data.parcel.category, "Земли лесного фонда");

    const missing = await call("POST", "/api/parcels/search", {
      query: "00:00:0000000:000",
    });
    assert.strictEqual(missing.status, 404);

    /* Авторизация */
    const badLogin = await call("POST", "/api/login", { email: "не-почта" });
    assert.strictEqual(badLogin.status, 400);

    const login = await call("POST", "/api/login", { email: "ivan@mail.ru" });
    assert.strictEqual(login.status, 200);
    const token = login.data.token;
    assert.ok(token);
    assert.strictEqual(login.data.user.name, "Иван Иванов");
    assert.strictEqual(login.data.user.balance, 14510);

    /* me и баланс */
    const me = await call("GET", "/api/me", undefined, token);
    assert.strictEqual(me.status, 200);
    assert.strictEqual(me.data.user.phone, "+7 (900) 123-45-67");

    const bal = await call("GET", "/api/balance", undefined, token);
    assert.strictEqual(bal.data.balance, 14510);

    /* Без токена — 401 */
    assert.strictEqual((await call("GET", "/api/me")).status, 401);

    /* Заказ с оплатой с баланса: 6990 + 490 + 990 + 790 = 9260; 14510-9260=5250 */
    const order = await call(
      "POST",
      "/api/orders",
      {
        parcelId: "36:25:6945030:776",
        roleId: "investor",
        moduleIds: ["eco", "build", "cadastre"],
        name: "Иван Иванов",
        email: "ivan@mail.ru",
        phone: "+7 (900) 123-45-67",
        payment: "balance",
      },
      token,
    );
    assert.strictEqual(order.status, 200);
    assert.strictEqual(order.data.total, 9260);
    assert.strictEqual(order.data.balance, 5250);
    assert.strictEqual(order.data.order.status, "В работе");

    /* Недостаточно средств → 402 */
    const poor = await call(
      "POST",
      "/api/orders",
      {
        roleId: "investor",
        moduleIds: [],
        name: "Иван Иванов",
        email: "ivan@mail.ru",
        phone: "+7 (900) 123-45-67",
        payment: "balance",
      },
      token,
    );
    assert.strictEqual(poor.status, 402);

    /* Валидация заказа: плохой телефон */
    const badPhone = await call("POST", "/api/orders", {
      roleId: "dachnik",
      moduleIds: [],
      name: "Иван Иванов",
      email: "ivan@mail.ru",
      phone: "123",
      payment: "card",
    });
    assert.strictEqual(badPhone.status, 400);

    /* Пополнение */
    const topup = await call(
      "POST",
      "/api/payments/topup",
      {
        amount: 2000,
        card: "4111111111111111",
        expiry: "12/28",
      },
      token,
    );
    assert.strictEqual(topup.status, 200);
    assert.strictEqual(topup.data.balance, 7250);
    assert.strictEqual(topup.data.payment.amount, 2000);

    const badTopup = await call(
      "POST",
      "/api/payments/topup",
      { amount: 50, card: "1", expiry: "1/28" },
      token,
    );
    assert.strictEqual(badTopup.status, 400);

    /* История */
    const orders = await call("GET", "/api/orders", undefined, token);
    assert.strictEqual(orders.data.orders.length, 5); // 4 сида + новый
    assert.strictEqual(orders.data.orders[0].tariff, "Инвестор / Девелопер");

    const payments = await call("GET", "/api/payments", undefined, token);
    assert.strictEqual(payments.data.payments.length, 6); // 4 сида + оплата заказа + пополнение
    assert.strictEqual(payments.data.payments[0].desc, "Пополнение баланса");

    const report = await call("GET", "/api/orders/o1042/report");
    assert.strictEqual(report.status, 200);
    assert.strictEqual(report.data.report.pdfUrl, "report-demo.html");

    /* Лид */
    const lead = await call("POST", "/api/leads", {
      name: "Пётр",
      contact: "+7 (900) 000-00-00",
      company: "Агро-Холдинг",
    });
    assert.strictEqual(lead.status, 200);
    assert.ok(lead.data.ok);
    assert.strictEqual(
      (
        await call("POST", "/api/leads", {
          name: "x",
          contact: "x",
          company: ".",
        })
      ).status,
      400,
    );

    /* Выход */
    const logout = await call("POST", "/api/logout", {}, token);
    assert.strictEqual(logout.status, 200);
    assert.strictEqual(
      (await call("GET", "/api/me", undefined, token)).status,
      401,
    );

    /* Swagger */
    const ui = await fetch(base + "/api-docs");
    assert.strictEqual(ui.status, 200);
    assert.ok((await ui.text()).indexOf("swagger-ui") !== -1);

    const spec = await call("GET", "/api-docs.json");
    assert.strictEqual(spec.status, 200);
    assert.strictEqual(Object.keys(spec.data.paths).length, 12);
    assert.ok(spec.data.paths["/api/orders"].post);
    const sass = await fetch(base + "/api-docs/swagger-ui.css");
    assert.strictEqual(sass.status, 200);

    console.log("api/express/test.js: ok");
  } catch (err) {
    console.error("FAIL:", err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
})();
