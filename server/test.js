"use strict";

/*
 * Smoke-тест API «Гео Разум» (ponytail: один runnable check вместо полноценного
 * тест-раннера). Запуск: npm test. Требуется Node 18+ (глобальный fetch).
 */

const app = require("./src/app");

const BASE = "http://127.0.0.1";

const results = [];
const t0 = Date.now();

function ok(name) {
  results.push({ name, pass: true });
  console.log("  ✅ " + name);
}

function fail(name, detail) {
  results.push({ name, pass: false });
  console.log("  ❌ " + name + (detail ? " — " + detail : ""));
}

async function req(method, path, { token, body, status = 200 } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    /* no body */
  }
  if (res.status !== status)
    throw new Error(
      method +
        " " +
        path +
        " -> ожидался " +
        status +
        ", получен " +
        res.status +
        " " +
        JSON.stringify(json),
    );
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const port = server.address().port;
  global.BASE_URL = BASE + ":" + port;
  const api = (p) => global.BASE_URL + p;

  console.log("Тест API «Гео Разум» на порту " + port + "\n");

  /* ---------- Health ---------- */
  const health = await req("GET", api("/api/health"));
  ok("GET /api/health (" + health.service + ")");

  /* ---------- Публичное: уровни, оферта, документы ---------- */
  const levels = await req("GET", api("/api/levels"));
  if (levels.levels && levels.levels.length === 3)
    ok("GET /api/levels — 3 уровня (S/M/L)");
  else fail("GET /api/levels — 3 уровня", JSON.stringify(levels));
  await req("GET", api("/api/offer"));

  /* ---------- Регистрация: валидация + успех ---------- */
  await req("POST", api("/api/auth/register"), {
    body: { firstName: "А", email: "bad", password: "1" },
    status: 400,
  });
  ok("POST /api/auth/register — невалидные данные -> 400");

  const email = "test" + Date.now() + "@mail.ru";
  const reg = await req("POST", api("/api/auth/register"), {
    body: {
      firstName: "Тест",
      lastName: "Тестов",
      email,
      phone: "+7 (911) 111-22-33",
      password: "test1234",
      confirmPassword: "test1234",
      consentPd: true,
      consentTerms: true,
    },
    status: 201,
  });
  const userToken = reg.token;
  if (reg.user && reg.user.email === email)
    ok("POST /api/auth/register — пользователь создан (" + email + ")");
  else
    fail("POST /api/auth/register — пользователь создан", JSON.stringify(reg));

  /* ---------- Кадастровые участки (требуют авторизации) ---------- */
  const parcel = await req("GET", api("/api/parcels/36:16:3405742:189"), {
    token: userToken,
  });
  ok(
    "GET /api/parcels — существующий участок (" +
      parcel.parcel.address.slice(0, 40) +
      "…)",
  );
  await req("GET", api("/api/parcels/123"), {
    token: userToken,
    status: 400,
  });
  ok("GET /api/parcels — неверный формат -> 400");
  await req("GET", api("/api/parcels/99:99:9999999:999"), {
    token: userToken,
    status: 404,
  });
  ok("GET /api/parcels — несуществующий участок -> 404");

  /* ---------- Логин демо-пользователя ---------- */
  const login = await req("POST", api("/api/auth/login"), {
    body: { email: "ivan@mail.ru", password: "demo1234" },
  });
  ok("POST /api/auth/login — демо-пользователь");
  const tok = login.token;

  const me = await req("GET", api("/api/auth/me"), { token: tok });
  if (me.user && me.user.role === "user")
    ok("GET /api/auth/me — демо-пользователь " + me.user.name);
  else fail("GET /api/auth/me", JSON.stringify(me));

  /* ---------- Заказ: без оферты 400, с офертой 201 ---------- */
  await req("POST", api("/api/orders"), {
    token: tok,
    body: { cadastral: "36:16:3405742:189", level: "s" },
    status: 400,
  });
  ok("POST /api/orders — без акцепта оферты -> 400");

  const order = await req("POST", api("/api/orders"), {
    token: tok,
    body: {
      cadastral: "36:16:3405742:189",
      level: "s",
      offerAccepted: true,
      offerVersion: "1.0",
    },
    status: 201,
  });
  if (order.order && order.order.status === "Ожидает оплаты")
    ok("POST /api/orders — заказ " + order.order.id + " создан");
  else fail("POST /api/orders — заказ создан", JSON.stringify(order));

  /* ---------- Оплата ---------- */
  await req("POST", api("/api/orders/" + order.order.id + "/pay"), {
    token: tok,
    body: {
      card: {
        number: "4242",
        expiry: "12/30",
        cvv: "123",
        holder: "IVAN IVANOV",
      },
    },
    status: 400,
  });
  ok("POST /pay — невалидная карта -> 400");

  await req("POST", api("/api/orders/" + order.order.id + "/pay"), {
    token: tok,
    body: {
      card: {
        number: "0000000000000000",
        expiry: "12/30",
        cvv: "123",
        holder: "IVAN IVANOV",
      },
    },
    status: 402,
  });
  ok("POST /pay — карта-отказ (0000…0000) -> 402");

  const paid = await req(
    "POST",
    api("/api/orders/" + order.order.id + "/pay"),
    {
      token: tok,
      body: {
        card: {
          number: "4111111111111111",
          expiry: "12/30",
          cvv: "123",
          holder: "IVAN IVANOV",
        },
      },
    },
  );
  if (paid.order.paidAt && paid.payment && paid.payment.status === "Оплачен")
    ok("POST /pay — оплата прошла, статус «Оплачен», генерация запущена");
  else fail("POST /pay — оплата прошла", JSON.stringify(paid));

  /* Повторная оплата запрещена */
  await req("POST", api("/api/orders/" + order.order.id + "/pay"), {
    token: tok,
    body: {
      card: {
        number: "4111111111111111",
        expiry: "12/30",
        cvv: "123",
        holder: "IVAN IVANOV",
      },
    },
    status: 400,
  });
  ok("POST /pay — повторная оплата -> 400");

  /* ---------- Генерация (мок ~4,2 с) ---------- */
  console.log("  … ждём завершения генерации (~5 с)");
  let finalOrder = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const o = await req("GET", api("/api/orders/" + order.order.id), {
      token: tok,
    });
    if (o.order.status === "Готово") {
      finalOrder = o.order;
      break;
    }
  }
  if (finalOrder && finalOrder.status === "Готово")
    ok("Генерация завершена — статус «Готово»");
  else
    fail(
      "Генерация завершена — статус «Готово»",
      finalOrder ? finalOrder.status : "таймаут",
    );

  const rep = await req(
    "GET",
    api("/api/orders/" + order.order.id + "/report"),
    { token: tok },
  );
  if (rep.report && rep.report.sections && rep.report.sections.length >= 7) {
    ok(
      "GET /report — отчёт сформирован (" +
        rep.report.sections.length +
        " разделов)",
    );
  } else fail("GET /report — отчёт сформирован", JSON.stringify(rep));

  await req("POST", api("/api/orders/" + order.order.id + "/resend-report"), {
    token: tok,
  });
  ok("POST /resend-report — повторная отправка на email");

  /* ---------- Платежи, уведомления, документы ---------- */
  const payments = await req("GET", api("/api/payments"), { token: tok });
  if (payments.payments.length >= 2)
    ok(
      "GET /api/payments — история платежей (" + payments.payments.length + ")",
    );
  else fail("GET /api/payments", JSON.stringify(payments));

  const nots = await req("GET", api("/api/notifications"), { token: tok });
  if (nots.notifications.length >= 3)
    ok(
      "GET /api/notifications — уведомления (" +
        nots.notifications.length +
        ")",
    );
  else fail("GET /api/notifications", JSON.stringify(nots));

  await req("POST", api("/api/notifications/read"), { token: tok, body: {} });
  ok("POST /api/notifications/read — прочитано");

  /* ---------- Личный счёт (кошелёк) ---------- */
  const wallet0 = await req("GET", api("/api/wallet"), { token: tok });
  if (
    wallet0.balance === 15100 &&
    wallet0.transactions.some((t) => t.type === "topup") &&
    wallet0.transactions.some((t) => t.type === "debit")
  )
    ok("GET /api/wallet — баланс сида 15100 ₽ и история операций");
  else fail("GET /api/wallet — сид", JSON.stringify(wallet0));

  await req("POST", api("/api/wallet/topup"), {
    token: tok,
    body: { amount: 50, card: { number: "4111111111111111" } },
    status: 400,
  });
  ok("POST /api/wallet/topup — сумма меньше минимума -> 400");

  await req("POST", api("/api/wallet/topup"), {
    token: tok,
    body: {
      amount: 1000,
      card: {
        number: "0000000000000000",
        expiry: "12/30",
        cvv: "123",
        holder: "IVAN IVANOV",
      },
    },
    status: 402,
  });
  ok("POST /api/wallet/topup — карта-отказ -> 402");

  const topup = await req("POST", api("/api/wallet/topup"), {
    token: tok,
    body: {
      amount: 1000,
      card: {
        number: "4111111111111111",
        expiry: "12/30",
        cvv: "123",
        holder: "IVAN IVANOV",
      },
    },
  });
  if (
    topup.balance === 16100 &&
    topup.transaction &&
    topup.transaction.type === "topup"
  )
    ok("POST /api/wallet/topup — пополнение на 1000 ₽, баланс 16100");
  else fail("POST /api/wallet/topup", JSON.stringify(topup));

  /* Оплата заказа с личного счёта */
  const sOrder = await req("POST", api("/api/orders"), {
    token: tok,
    body: {
      cadastral: "36:16:3405742:189",
      level: "s",
      offerAccepted: true,
      offerVersion: "1.0",
    },
    status: 201,
  });
  const paidFromBalance = await req(
    "POST",
    api("/api/orders/" + sOrder.order.id + "/pay"),
    { token: tok, body: { fromBalance: true } },
  );
  if (
    paidFromBalance.balance === 16100 - 4900 &&
    paidFromBalance.payment.method === "balance"
  )
    ok("POST /pay fromBalance — списание 4900 ₽, метод balance");
  else fail("POST /pay fromBalance", JSON.stringify(paidFromBalance));

  /* Недостаточно средств: уровень L (49900 ₽) при остатке 11200 */
  const lOrder = await req("POST", api("/api/orders"), {
    token: tok,
    body: {
      cadastral: "36:25:6945030:776",
      level: "l",
      offerAccepted: true,
      offerVersion: "1.0",
    },
    status: 201,
  });
  await req("POST", api("/api/orders/" + lOrder.order.id + "/pay"), {
    token: tok,
    body: { fromBalance: true },
    status: 400,
  });
  ok("POST /pay fromBalance — недостаточно средств -> 400");

  const wallet1 = await req("GET", api("/api/wallet"), { token: tok });
  if (wallet1.balance === 11200)
    ok("GET /api/wallet — остаток 11200 ₽ после списания");
  else fail("GET /api/wallet — остаток", JSON.stringify(wallet1));

  /* ---------- Админка ---------- */
  const adminLogin = await req("POST", api("/api/auth/login"), {
    body: { email: "admin@georazum.ru", password: "admin123" },
  });
  ok("POST /api/auth/login — администратор");
  const at = adminLogin.token;

  const stats = await req("GET", api("/api/admin/stats"), { token: at });
  if (stats.stats && stats.stats.orders >= 2)
    ok(
      "GET /api/admin/stats — статистика (заказов: " + stats.stats.orders + ")",
    );
  else fail("GET /api/admin/stats", JSON.stringify(stats));

  const users = await req("GET", api("/api/admin/users"), { token: at });
  if (users.users && users.users.length >= 2)
    ok("GET /api/admin/users — список пользователей");
  else fail("GET /api/admin/users", JSON.stringify(users));

  const adminIvan = users.users.find((u) => u.email === "ivan@mail.ru");
  if (adminIvan && typeof adminIvan.balance === "number")
    ok("GET /api/admin/users — у пользователей есть баланс");
  else fail("GET /api/admin/users — баланс", JSON.stringify(adminIvan));

  const adminWallet = await req(
    "GET",
    api("/api/admin/users/" + adminIvan.id + "/wallet"),
    { token: at },
  );
  if (
    adminWallet.user.balance === adminIvan.balance &&
    adminWallet.transactions.length >= 1
  )
    ok("GET /api/admin/users/:id/wallet — баланс и история пользователя");
  else fail("GET /api/admin/users/:id/wallet", JSON.stringify(adminWallet));

  const adminTopup = await req(
    "POST",
    api("/api/admin/users/" + adminIvan.id + "/topup"),
    { token: at, body: { amount: 500 } },
  );
  if (adminTopup.user.balance === adminIvan.balance + 500)
    ok("POST /api/admin/users/:id/topup — пополнение техподдержкой +500");
  else fail("POST /api/admin/users/:id/topup", JSON.stringify(adminTopup));

  const newUserId = users.users.find((u) => u.email === email).id;
  await req("PATCH", api("/api/admin/users/" + newUserId + "/block"), {
    token: at,
    body: { blocked: true },
  });
  await req("PATCH", api("/api/admin/users/" + newUserId + "/block"), {
    token: at,
    body: { blocked: false },
  });
  ok("PATCH /api/admin/users/:id/block — блокировка/разблокировка");

  await req("PATCH", api("/api/admin/orders/" + order.order.id + "/status"), {
    token: at,
    body: { status: "Требуется вмешательство специалиста" },
  });
  await req("PATCH", api("/api/admin/orders/" + order.order.id + "/status"), {
    token: at,
    body: { status: "Готово" },
  });
  ok("PATCH /api/admin/orders/:id/status — смена статуса");

  const generations = await req("GET", api("/api/admin/generations"), {
    token: at,
  });
  if (generations.generations.length >= 1)
    ok("GET /api/admin/generations — мониторинг генераций");
  else fail("GET /api/admin/generations", JSON.stringify(generations));

  const patched = await req("PATCH", api("/api/admin/levels/s"), {
    token: at,
    body: { price: 5200 },
  });
  if (patched.levels.find((l) => l.id === "s").price === 5200)
    ok("PATCH /api/admin/levels/s — изменение тарифа");
  else fail("PATCH /api/admin/levels/s", JSON.stringify(patched));
  await req("PATCH", api("/api/admin/levels/s"), {
    token: at,
    body: { price: 4900 },
  });

  /* ---------- Оферта: новая редакция + старый акцепт -> 409 ---------- */
  await req("PUT", api("/api/admin/offer"), {
    token: at,
    body: { version: "2.0", text: db_offer_text() },
  });
  ok("PUT /api/admin/offer — новая редакция v2.0");

  await req("POST", api("/api/orders"), {
    token: tok,
    body: {
      cadastral: "36:34:1823050:441",
      level: "m",
      offerAccepted: true,
      offerVersion: "1.0",
    },
    status: 409,
  });
  ok("POST /api/orders — старая версия оферты -> 409");
  await req("PUT", api("/api/admin/offer"), {
    token: at,
    body: { version: "1.0", text: db_offer_text() },
  });

  /* ---------- Logout и проверка 401 ---------- */
  await req("POST", api("/api/auth/logout"), { token: tok });
  ok("POST /api/auth/logout");
  await req("GET", api("/api/auth/me"), { token: tok, status: 401 });
  ok("GET /api/auth/me после logout -> 401");

  await req("POST", api("/api/auth/logout"), { token: at });

  console.log("");
  closeServer(server);
}

/* На Windows process.exit с открытыми fetch-соединениями даёт assertion
 * в libuv, поэтому корректно закрываем сервер и выходим через exitCode. */
function closeServer(server) {
  if (server && server.closeAllConnections) server.closeAllConnections();
  if (server) server.close();
}

function db_offer_text() {
  return ["1. Общие положения.", "2. Предмет.", "3. Акцепт."];
}

main()
  .then(() => {
    const failed = results.filter((r) => !r.pass).length;
    console.log(
      "Итог: " +
        results.filter((r) => r.pass).length +
        " ✅, " +
        failed +
        " ❌ за " +
        ((Date.now() - t0) / 1000).toFixed(1) +
        " с",
    );
    process.exitCode = failed ? 1 : 0;
  })
  .catch((e) => {
    console.error(
      "\nТест упал: " +
        e.message +
        (e.cause ? " (cause: " + e.cause.message + ")" : ""),
    );
    process.exitCode = 1;
  });
