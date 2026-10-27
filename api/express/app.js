"use strict";

/*
 * Гео Разум — полный REST API (мок, без БД).
 * Запуск: npm install && npm start  (порт 3001, см. PORT)
 * Тест:   npm test
 * Документация: http://127.0.0.1:3001/api-docs  (Swagger UI)
 *
 * ponytail: данные и токены живут в памяти процесса — при рестарте сбрасываются.
 * Это осознанный предел мок-апи. Для прод-версии — СУБД и подписанные токены (JWT).
 */

const express = require("express");
const crypto = require("crypto");
const swaggerUi = require("swagger-ui-express");
const openapi = require("./openapi.js");

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* ---------- Данные (моки, повторяют наполнение сайта) ---------- */

const TARIFFS = {
  dachnik: { icon: "🏡", name: "Дачник / Частный покупатель", price: 2990 },
  realtor: { icon: "🏢", name: "Риэлтор / Агент", price: 3490 },
  investor: { icon: "📈", name: "Инвестор / Девелопер", price: 6990 },
  lawyer: { icon: "⚖️", name: "Юрист / Кадастровый инженер", price: 4490 },
  combo: {
    icon: "🧩",
    name: "Комбо-тариф (свободный набор модулей)",
    price: 1490,
  },
};

const MODULES = {
  eco: {
    name: "ЭкоКонтроль",
    price: 490,
    note: "Детальный анализ борщевика, свалок и эрозии почв по спутниковым снимкам.",
  },
  build: {
    name: "СтройЭксперт",
    price: 990,
    note: "Проверка реалистичности смет и стоимости подключения сетей в вашем регионе.",
  },
  cadastre: {
    name: "Кадастр",
    price: 790,
    note: "Оценка вероятности снижения кадастровой стоимости и рыночная цена участка.",
  },
};

const MOCK_PARCEL = {
  id: "36:25:6945030:776",
  address: "Воронежская обл., Рамонский р-н, урочище «Подгоренская дача»",
  area: "11 203 м² (1,1 га)",
  cadastralValue: "6 412 485 ₽",
  category: "Земли лесного фонда",
  vri: "Осуществление рекреационной деятельности",
  infra: {
    road: "99,9 м",
    power: "262,2 м (РП-10 кВ № 3-27)",
    gas: "194,5 м",
    water: "80,9 м",
    sewer: "708,1 м",
  },
  limits: ["Приаэродромная территория", "Зона охраняемого объекта"],
  buildable: "9 691 м²",
};

const db = {
  user: {
    id: "u1",
    name: "Иван Иванов",
    email: "ivan@mail.ru",
    phone: "+7 (900) 123-45-67",
    inn: "366212345678",
    region: "Воронежская область",
    role: "Инвестор / Девелопер",
    status: "Постоянный клиент",
    balance: 14510,
  },
  orders: [
    {
      id: "o1042",
      date: "03.10.2026",
      parcel: "36:25:6945030:776",
      address: "Воронежская обл., Рамонский р-н",
      tariff: "Инвестор",
      status: "Готов",
    },
    {
      id: "o1041",
      date: "21.09.2026",
      parcel: "36:16:3405742:189",
      address: "Воронежская обл., Новоусманский р-н",
      tariff: "Дачник",
      status: "Готов",
    },
    {
      id: "o1040",
      date: "14.09.2026",
      parcel: "36:34:1823050:441",
      address: "Воронежская обл., Острогожский р-н",
      tariff: "Юрист",
      status: "Возврат",
    },
    {
      id: "o1043",
      date: "24.10.2026",
      parcel: "36:25:6945030:776",
      address: "Воронежская обл., Рамонский р-н",
      tariff: "Комбо",
      status: "В работе",
    },
  ],
  payments: [
    {
      id: "p1",
      date: "03.10.2026",
      desc: "Отчёт «Инвестор / Девелопер»",
      amount: -6990,
      status: "Оплачен",
    },
    {
      id: "p2",
      date: "21.09.2026",
      desc: "Отчёт «Дачник / Частный покупатель»",
      amount: -2990,
      status: "Оплачен",
    },
    {
      id: "p3",
      date: "14.09.2026",
      desc: "Возврат по заказу № 1024 (тариф «Юрист»)",
      amount: 4490,
      status: "Зачислен",
    },
    {
      id: "p4",
      date: "02.09.2026",
      desc: "Пополнение баланса",
      amount: 20000,
      status: "Зачислен",
    },
  ],
  tokens: new Map(), // token -> userId
  seq: { order: 1044, payment: 5 },
};

/* ---------- Хелперы ---------- */

const rub = (n) => n.toLocaleString("ru-RU") + " ₽";
const digits = (v) => String(v == null ? "" : v).replace(/\D/g, "");
const today = () => new Date().toLocaleDateString("ru-RU");

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/.test(String(v || "").trim());
const isPhone = (v) => digits(v).length === 11;
const isName = (v) => String(v || "").trim().length >= 2;

/* Срок действия карты ММ/ГГ: 4 цифры, месяц 01–12, не в прошлом. */
function isExpiryValid(v) {
  const d = digits(v);
  if (d.length !== 4) return false;
  const month = +d.slice(0, 2);
  if (month < 1 || month > 12) return false;
  const year = 2000 + +d.slice(2);
  const now = new Date();
  return (
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1)
  );
}

function totalPrice(roleId, moduleIds) {
  const base = TARIFFS[roleId] ? TARIFFS[roleId].price : 0;
  return (moduleIds || []).reduce(
    (sum, id) => sum + (MODULES[id] ? MODULES[id].price : 0),
    base,
  );
}

function authUser(req) {
  const h = req.get("authorization") || "";
  const token = h.replace(/^Bearer\s+/i, "");
  return token && db.tokens.get(token) ? db.user : null;
}

const requireAuth = (req, res, next) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "Требуется авторизация." });
  req.user = user;
  next();
};

/* ---------- Роуты ---------- */

/* Авторизация (мок: подходит любой корректный email) */
app.post("/api/login", (req, res) => {
  const email = String((req.body && req.body.email) || "").trim();
  if (!isEmail(email))
    return res.status(400).json({ error: "Укажите корректный email." });
  const token = crypto.randomBytes(16).toString("hex");
  db.tokens.set(token, db.user.id);
  res.json({ token, user: db.user });
});

app.post("/api/logout", requireAuth, (req, res) => {
  const h = req.get("authorization") || "";
  db.tokens.delete(h.replace(/^Bearer\s+/i, ""));
  res.json({ ok: true });
});

app.get("/api/me", requireAuth, (req, res) => res.json({ user: req.user }));

/* Каталог */
app.get("/api/tariffs", (req, res) =>
  res.json({
    tariffs: Object.entries(TARIFFS).map(([id, t]) => ({ id, ...t })),
  }),
);
app.get("/api/modules", (req, res) =>
  res.json({
    modules: Object.entries(MODULES).map(([id, m]) => ({ id, ...m })),
  }),
);

/* Участок по кадастровому номеру */
app.post("/api/parcels/search", (req, res) => {
  const query = String((req.body && req.body.query) || "").trim();
  if (!query)
    return res.status(400).json({ error: "Введите кадастровый номер." });
  if (query.indexOf("36:25:6945030:776") !== -1)
    return res.json({ parcel: MOCK_PARCEL });
  res
    .status(404)
    .json({ error: "Участок не найден. Проверьте кадастровый номер." });
});

/* Заказ отчета: кор-логика сайта */
app.post("/api/orders", (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim();
  const phone = String(b.phone || "").trim();
  const roleId = String(b.roleId || "");
  const moduleIds = Array.isArray(b.moduleIds) ? b.moduleIds : [];
  if (!isName(name))
    return res.status(400).json({ error: "Укажите имя и фамилию." });
  if (!isEmail(email))
    return res.status(400).json({ error: "Проверьте email." });
  if (!isPhone(phone))
    return res.status(400).json({ error: "Проверьте телефон: 11 цифр." });
  if (!TARIFFS[roleId])
    return res.status(400).json({ error: "Выберите формат отчета." });
  const total = totalPrice(roleId, moduleIds);
  if (total <= 0)
    return res.status(400).json({ error: "Сумма заказа не определена." });

  const user = authUser(req);
  if (b.payment === "balance") {
    if (!user)
      return res.status(401).json({ error: "Оплата с баланса требует входа." });
    if (user.balance < total)
      return res
        .status(402)
        .json({ error: "Недостаточно средств на балансе." });
    user.balance -= total;
    db.payments.push({
      id: "p" + db.seq.payment++,
      date: today(),
      desc: "Оплата отчёта",
      amount: -total,
      status: "Оплачен",
    });
  }

  const order = {
    id: "o" + db.seq.order++,
    date: today(),
    parcel: b.parcelId || MOCK_PARCEL.id,
    address: MOCK_PARCEL.address.slice(0, 40),
    tariff: TARIFFS[roleId].name,
    status: "В работе",
  };
  db.orders.unshift(order);
  res.json({ order, total, balance: user ? user.balance : undefined });
});

app.get("/api/orders", requireAuth, (req, res) =>
  res.json({ orders: db.orders }),
);

app.get("/api/orders/:id/report", (req, res) =>
  res.json({ report: { id: req.params.id, pdfUrl: "report-demo.html" } }),
);

/* Баланс и история платежей */
app.get("/api/payments", requireAuth, (req, res) =>
  res.json({ payments: db.payments }),
);
app.get("/api/balance", requireAuth, (req, res) =>
  res.json({ balance: req.user.balance }),
);

app.post("/api/payments/topup", requireAuth, (req, res) => {
  const b = req.body || {};
  const amount = Math.floor(+b.amount || 0);
  const card = digits(b.card);
  if (amount < 100)
    return res
      .status(400)
      .json({ error: "Минимальная сумма пополнения — 100 ₽." });
  if (card.length !== 16)
    return res.status(400).json({ error: "Введите 16 цифр номера карты." });
  if (!isExpiryValid(b.expiry))
    return res
      .status(400)
      .json({ error: "Проверьте срок действия карты ММ/ГГ." });
  req.user.balance += amount;
  const payment = {
    id: "p" + db.seq.payment++,
    date: today(),
    desc: "Пополнение баланса",
    amount,
    status: "Зачислен",
  };
  db.payments.unshift(payment);
  res.json({ balance: req.user.balance, payment });
});

/* B2B/B2G заявка */
app.post("/api/leads", (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  const contact = String(b.contact || "").trim();
  const company = String(b.company || "").trim();
  if (!isName(name) || !company || company.length < 2)
    return res
      .status(400)
      .json({ error: "Заполните имя и название организации." });
  const okContact =
    contact.indexOf("@") > 0 ? isEmail(contact) : isPhone(contact);
  if (!okContact)
    return res
      .status(400)
      .json({ error: "Укажите корректный email или телефон." });
  res.json({
    ok: true,
    message: "Заявка отправлена. Менеджер по интеграциям свяжется с вами.",
  });
});

/* Swagger UI: /api-docs — интерактивная документация, /api-docs.json — сырой спек. */
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openapi, { customSiteTitle: "Гео Разум API" }),
);
app.get("/api-docs.json", (req, res) => res.json(openapi));

/* 404 для остального */
app.use((req, res) => res.status(404).json({ error: "Не найдено." }));

/* ---------- Запуск ---------- */
const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => console.log("Georazum API: http://127.0.0.1:" + PORT));
}

module.exports = app;
