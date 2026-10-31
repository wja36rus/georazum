"use strict";

/*
 * Гео Разум — REST API (Express, in-memory мок).
 * Все эндпоинты под ТЗ: авторизация, уровни S/M/L, участки, заказы, оплата,
 * генерация, отчёты, ЛК, уведомления, админка.
 */

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { db, hash, verify, CADASTRAL_RE } = require("./db");
const { buildReport } = require("./report");
const {
  STATUSES,
  pushStatus,
  startGeneration,
  retryGeneration,
  notify,
  notifyAdmins,
  fmt,
} = require("./generation");

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- Хелперы ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/;
const NAME_RE = /^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\-\s]{1,49}$/;
const digits = (v) => String(v == null ? "" : v).replace(/\D/g, "");

const publicUser = (u) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  name: u.firstName + " " + u.lastName,
  email: u.email,
  phone: u.phone,
  role: u.role,
  confirmed: u.confirmed,
  blocked: u.blocked,
  createdAt: u.createdAt,
});

const levelsPublic = () => Object.values(db.levels).map((l) => ({ ...l }));

const orderSummary = (o) => ({
  id: o.id,
  cadastral: o.parcel.cadastral,
  level: o.level,
  levelName: (db.levels[o.level] || {}).name || o.level,
  price: o.price,
  status: o.status,
  createdAt: o.createdAt,
  paidAt: o.paidAt || null,
  reportId: o.reportId || null,
});

const orderFull = (o) => {
  const payment = [...db.payments].reverse().find((p) => p.orderId === o.id) || null;
  return {
    ...orderSummary(o),
    parcel: o.parcel,
    params: o.params || {},
    offer: o.offer,
    statusHistory: o.statusHistory,
    transactionId: o.transactionId || null,
    generationAttempts: o.generationAttempts || 0,
    payment,
  };
};

const tokenFrom = (req) => {
  const h = req.get("authorization") || "";
  return h.replace(/^Bearer\s+/i, "").trim();
};
const authUser = (req) => {
  const token = tokenFrom(req);
  return (token && db.tokens.get(token)) || null;
};
const issueToken = (user) => {
  const token = crypto.randomBytes(24).toString("hex");
  db.tokens.set(token, user.id);
  return token;
};

const requireAuth = (req, res, next) => {
  const userId = authUser(req);
  const user = userId && db.users.find((u) => u.id === userId);
  if (!user) return res.status(401).json({ error: "Требуется авторизация." });
  if (user.blocked) return res.status(403).json({ error: "Аккаунт заблокирован. Обратитесь в поддержку." });
  req.user = user;
  next();
};
const requireAdmin = (req, res, next) =>
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Доступ только для администратора." });
    next();
  });

const findOrder = (id) => db.orders.find((o) => o.id === id);
const ownsOrder = (user, order) => user.role === "admin" || order.userId === user.id;

/* ---------- Служебное ---------- */

app.get("/api/health", (req, res) => res.json({ ok: true, service: "georazum", time: fmt(new Date()) }));

/* ---------- Авторизация и профиль (п. 4 ТЗ) ---------- */

app.post("/api/auth/register", (req, res) => {
  const b = req.body || {};
  const firstName = String(b.firstName || "").trim();
  const lastName = String(b.lastName || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  const phone = String(b.phone || "").trim();
  const password = String(b.password || "");
  const confirmPassword = String(b.confirmPassword || "");

  if (!NAME_RE.test(firstName)) return res.status(400).json({ error: "Укажите имя (только буквы, от 2 символов)." });
  if (!NAME_RE.test(lastName)) return res.status(400).json({ error: "Укажите фамилию (только буквы, от 2 символов)." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Укажите корректный email." });
  if (digits(phone).length !== 11) return res.status(400).json({ error: "Телефон должен содержать 11 цифр." });
  if (password.length < 8) return res.status(400).json({ error: "Пароль должен быть не короче 8 символов." });
  if (password !== confirmPassword) return res.status(400).json({ error: "Пароли не совпадают." });
  if (!b.consentPd || !b.consentTerms)
    return res.status(400).json({ error: "Необходимо согласие на обработку персональных данных и с условиями." });
  if (db.users.some((u) => u.email === email))
    return res.status(409).json({ error: "Пользователь с таким email уже зарегистрирован." });

  const user = {
    id: "u" + db.seq.user++,
    firstName,
    lastName,
    email,
    phone,
    password: hash(password),
    role: "user",
    blocked: false,
    /* ponytail: подтверждение email в демо автоматическое; в проде — письмо
       со ссылкой и confirmed=false до перехода по ней. */
    confirmed: true,
    createdAt: fmt(new Date()),
  };
  db.users.push(user);
  db.emails.push({
    to: email,
    subject: "Гео Разум: подтверждение регистрации",
    text: "Здравствуйте, " + firstName + "! Аккаунт создан. Вход: /login.",
    sentAt: fmt(new Date()),
  });
  notify(user.id, "account", "Добро пожаловать в Гео Разум! Аккаунт создан, email подтверждён (демо).");
  notifyAdmins("user", "Новая регистрация: " + user.name + " (" + email + ").");
  res.status(201).json({ token: issueToken(user), user: publicUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const email = String((req.body || {}).email || "").trim().toLowerCase();
  const password = String((req.body || {}).password || "");
  const user = db.users.find((u) => u.email === email);
  if (!user || !verify(password, user.password))
    return res.status(401).json({ error: "Неверный email или пароль." });
  if (user.blocked) return res.status(403).json({ error: "Аккаунт заблокирован. Обратитесь в поддержку." });
  res.json({ token: issueToken(user), user: publicUser(user) });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  db.tokens.delete(tokenFrom(req));
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.patch("/api/auth/profile", requireAuth, (req, res) => {
  const b = req.body || {};
  if (b.firstName !== undefined) {
    if (!NAME_RE.test(String(b.firstName).trim())) return res.status(400).json({ error: "Некорректное имя." });
    req.user.firstName = String(b.firstName).trim();
  }
  if (b.lastName !== undefined) {
    if (!NAME_RE.test(String(b.lastName).trim())) return res.status(400).json({ error: "Некорректная фамилия." });
    req.user.lastName = String(b.lastName).trim();
  }
  if (b.phone !== undefined) {
    if (digits(b.phone).length !== 11) return res.status(400).json({ error: "Телефон должен содержать 11 цифр." });
    req.user.phone = String(b.phone).trim();
  }
  if (b.email !== undefined) {
    const email = String(b.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Некорректный email." });
    if (db.users.some((u) => u.email === email && u.id !== req.user.id))
      return res.status(409).json({ error: "Этот email уже используется." });
    req.user.email = email;
    /* В проде — повторное подтверждение email. В демо — сразу. */
  }
  res.json({ user: publicUser(req.user) });
});

app.patch("/api/auth/password", requireAuth, (req, res) => {
  const b = req.body || {};
  if (!verify(String(b.currentPassword || ""), req.user.password))
    return res.status(400).json({ error: "Текущий пароль указан неверно." });
  if (String(b.newPassword || "").length < 8)
    return res.status(400).json({ error: "Новый пароль должен быть не короче 8 символов." });
  req.user.password = hash(String(b.newPassword));
  /* Завершаем остальные сессии пользователя (п. 4.2 ТЗ). */
  for (const [token, userId] of db.tokens) if (userId === req.user.id) db.tokens.delete(token);
  res.json({ ok: true, token: issueToken(req.user) });
});

app.post("/api/auth/recovery", (req, res) => {
  const email = String((req.body || {}).email || "").trim().toLowerCase();
  const user = db.users.find((u) => u.email === email);
  if (user) {
    db.emails.push({
      to: email,
      subject: "Гео Разум: восстановление пароля",
      text: "Ссылка для восстановления пароля (демо).",
      sentAt: fmt(new Date()),
    });
    notify(user.id, "account", "Запрошено восстановление пароля. Письмо отправлено на " + email + ".");
  }
  /* Не раскрываем, зарегистрирован ли email. */
  res.json({ ok: true, message: "Если email зарегистрирован, письмо со ссылкой отправлено." });
});

app.post("/api/auth/delete-request", requireAuth, (req, res) => {
  if (!verify(String((req.body || {}).password || ""), req.user.password))
    return res.status(400).json({ error: "Пароль указан неверно." });
  req.user.deleteRequestedAt = fmt(new Date());
  notifyAdmins("account", "Запрос на удаление аккаунта: " + req.user.name + " (" + req.user.email + ").");
  res.json({ ok: true, message: "Запрос на удаление аккаунта принят. С вами свяжутся для подтверждения." });
});

/* ---------- Каталог: уровни, оферта, документы (п. 3, 5, 7 ТЗ) ---------- */

app.get("/api/levels", (req, res) => res.json({ levels: levelsPublic() }));

app.get("/api/offer", (req, res) => res.json({ offer: db.offer }));

app.get("/api/documents", (req, res) =>
  res.json({ documents: db.documents.map((d) => ({ id: d.id, title: d.title, updatedAt: d.updatedAt })) }),
);

const DOC_TEXTS = {
  privacy: [
    "1. Оператор персональных данных: ООО «Гео Разум».",
    "2. Обрабатываются: имя, фамилия, email, телефон, кадастровые номера из заказов.",
    "3. Данные обрабатываются для оказания услуг и уведомлений; передача третьим лицам — только платёжному провайдеру и сервису рассылок.",
    "4. Пользователь вправе запросить удаление аккаунта в личном кабинете.",
    "5. Платёжные данные карт на сайте не хранятся — их обрабатывает платёжный провайдер.",
  ],
  refunds: [
    "1. Возврат средств возможен, если услуга не была оказана по вине Исполнителя.",
    "2. Заявление на возврат направляется через форму поддержки или на support@georazum.ru.",
    "3. Срок рассмотрения — до 10 рабочих дней; возврат — на карту оплаты в течение 5 рабочих дней после одобрения.",
    "4. При ошибке генерации повторный запуск производится бесплатно (двойного списания не допускается).",
  ],
};

app.get("/api/documents/:id", (req, res) => {
  const doc = db.documents.find((d) => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: "Документ не найден." });
  const text = doc.id === "offer" ? db.offer.text : DOC_TEXTS[doc.id] || [];
  res.json({ document: { ...doc, text } });
});

/* Демо-отчёт для страницы «Примеры» (публичный) */
app.get("/api/examples/report", (req, res) => {
  const o = {
    id: "DEMO",
    level: "l",
    price: db.levels.l.price,
    parcel: db.parcels["36:25:6945030:776"],
    params: {
      direction: "Лесной ретрит «Тихая поляна»",
      budget: "90–120 млн ₽",
      payback: "96 месяцев",
      yield: "18% годовых",
      objects: "Глэмпинг на 89 мест + ресторан",
    },
  };
  res.json({ report: buildReport(o) });
});

/* ---------- Участки (п. 6.2 ТЗ) ---------- */

app.get("/api/parcels/:cadastral", requireAuth, (req, res) => {
  const cadastral = String(req.params.cadastral || "").trim();
  if (!CADASTRAL_RE.test(cadastral))
    return res.status(400).json({ error: "Кадастровый номер должен быть в формате XX:XX:XXXXXXX:XXX." });
  const parcel = db.parcels[cadastral];
  if (!parcel)
    return res.status(404).json({ error: "Участок не найден в доступных источниках. Проверьте номер." });
  res.json({ parcel });
});

/* ---------- Заказы (п. 6, 7, 8 ТЗ) ---------- */

const cardValid = (card) => {
  const c = card || {};
  const number = digits(c.number);
  if (number.length !== 16) return "Номер карты должен содержать 16 цифр.";
  const exp = digits(c.expiry);
  if (exp.length !== 4) return "Срок действия карты — формат ММ/ГГ.";
  const month = +exp.slice(0, 2);
  const year = 2000 + +exp.slice(2);
  const d = new Date();
  if (month < 1 || month > 12) return "Некорректный месяц срока действия.";
  if (year < d.getFullYear() || (year === d.getFullYear() && month < d.getMonth() + 1))
    return "Срок действия карты истёк.";
  if (digits(c.cvv).length !== 3) return "CVV должен содержать 3 цифры.";
  if (String(c.holder || "").trim().length < 3) return "Укажите имя владельца карты.";
  return "";
};

app.post("/api/orders", requireAuth, (req, res) => {
  const b = req.body || {};
  const cadastral = String(b.cadastral || "").trim();
  const levelId = String(b.level || "").toLowerCase();

  if (!CADASTRAL_RE.test(cadastral))
    return res.status(400).json({ error: "Кадастровый номер должен быть в формате XX:XX:XXXXXXX:XXX." });
  const parcel = db.parcels[cadastral];
  if (!parcel) return res.status(404).json({ error: "Участок не найден. Платная генерация не запущена." });
  const level = db.levels[levelId];
  if (!level) return res.status(400).json({ error: "Выберите уровень анализа S, M или L." });
  if (level.available === false) return res.status(400).json({ error: "Этот уровень временно недоступен." });
  if (b.offerAccepted !== true)
    return res.status(400).json({ error: "Необходимо принять условия публичной оферты." });
  if (String(b.offerVersion || "") !== db.offer.version)
    return res.status(409).json({ error: "Оферта обновилась. Ознакомьтесь с новой редакцией v" + db.offer.version + "." });

  const order = {
    id: "GR-" + db.seq.order++,
    userId: req.user.id,
    parcel,
    level: level.id,
    price: level.price,
    status: "Ожидает оплаты",
    statusHistory: [
      { status: "Заказ создан", at: fmt(new Date()) },
      { status: "Ожидает оплаты", at: fmt(new Date()) },
    ],
    params: level.id === "l" ? { ...(b.params || {}) } : {},
    offer: { version: db.offer.version, acceptedAt: fmt(new Date()) },
    createdAt: fmt(new Date()),
    paidAt: null,
    reportId: null,
    transactionId: null,
    generationAttempts: 0,
  };
  db.orders.unshift(order);
  notify(req.user.id, "order", "Заказ " + order.id + " создан. Ожидает оплаты.");
  res.status(201).json({ order: orderFull(order) });
});

app.get("/api/orders", requireAuth, (req, res) => {
  const own = db.orders.filter((o) => o.userId === req.user.id);
  res.json({ orders: own.map(orderSummary) });
});

app.get("/api/orders/:id", requireAuth, (req, res) => {
  const order = findOrder(req.params.id);
  if (!order || !ownsOrder(req.user, order)) return res.status(404).json({ error: "Заказ не найден." });
  res.json({ order: orderFull(order) });
});

app.post("/api/orders/:id/pay", requireAuth, (req, res) => {
  const order = findOrder(req.params.id);
  if (!order || !ownsOrder(req.user, order)) return res.status(404).json({ error: "Заказ не найден." });
  if (order.paidAt) return res.status(400).json({ error: "Заказ уже оплачен. Повторное списание не выполняется." });

  const card = (req.body || {}).card;
  const cardError = cardValid(card);
  if (cardError) return res.status(400).json({ error: "Платёж отклонён: " + cardError });

  const number = digits(card.number);
  const transactionId = "txn-" + crypto.randomBytes(6).toString("hex");

  if (number === "0000000000000000") {
    const failed = {
      id: "P-" + db.seq.payment++,
      orderId: order.id,
      userId: req.user.id,
      amount: order.price,
      method: "card",
      status: "Ошибка",
      createdAt: fmt(new Date()),
      transactionId,
    };
    db.payments.unshift(failed);
    pushStatus(order, "Ожидает оплаты");
    notify(req.user.id, "payment", "Оплата заказа " + order.id + " отклонена банком. Попробуйте другую карту.");
    return res.status(402).json({ error: "Платёж отклонён банком. Попробуйте другую карту." });
  }

  const payment = {
    id: "P-" + db.seq.payment++,
    orderId: order.id,
    userId: req.user.id,
    amount: order.price,
    method: "card",
    status: "Оплачен",
    createdAt: fmt(new Date()),
    transactionId,
  };
  db.payments.unshift(payment);
  order.paidAt = fmt(new Date());
  order.transactionId = transactionId;
  pushStatus(order, "Оплачен");
  notify(req.user.id, "payment", "Оплата заказа " + order.id + " на " + order.price.toLocaleString("ru-RU") + " ₽ прошла успешно.");
  notifyAdmins("payment", "Новый оплаченный заказ " + order.id + " (" + order.level.toUpperCase() + ") на сумму " + order.price.toLocaleString("ru-RU") + " ₽.");
  startGeneration(order);

  res.json({ order: orderFull(order), payment });
});

app.post("/api/orders/:id/retry", requireAuth, (req, res) => {
  const order = findOrder(req.params.id);
  if (!order || !ownsOrder(req.user, order)) return res.status(404).json({ error: "Заказ не найден." });
  const retryable = order.status === "Ошибка генерации" || order.status === "Требуется вмешательство специалиста";
  if (!retryable && req.user.role !== "admin")
    return res.status(400).json({ error: "Повторный запуск доступен только при ошибке генерации." });
  retryGeneration(order);
  notify(req.user.id, "order", "Генерация по заказу " + order.id + " запущена повторно.");
  res.json({ order: orderFull(order) });
});

app.post("/api/orders/:id/resend-report", requireAuth, (req, res) => {
  const order = findOrder(req.params.id);
  if (!order || !ownsOrder(req.user, order)) return res.status(404).json({ error: "Заказ не найден." });
  if (!order.reportId) return res.status(400).json({ error: "Отчёт ещё не сформирован." });
  db.emails.push({
    to: req.user.email,
    subject: "Гео Разум: отчёт по участку " + order.parcel.cadastral,
    text: "Повторная отправка. Скачать: /order/" + order.id + "/report",
    sentAt: fmt(new Date()),
  });
  notify(req.user.id, "email", "Отчёт по заказу " + order.id + " повторно отправлен на " + req.user.email + ".");
  res.json({ ok: true, to: req.user.email });
});

app.get("/api/orders/:id/report", requireAuth, (req, res) => {
  const order = findOrder(req.params.id);
  if (!order || !ownsOrder(req.user, order)) return res.status(404).json({ error: "Заказ не найден." });
  if (!order.reportId) return res.status(404).json({ error: "Отчёт ещё не готов." });
  if (!db.reports[order.reportId]) db.reports[order.reportId] = buildReport(order);
  res.json({ report: db.reports[order.reportId] });
});

/* ---------- Платежи и уведомления ---------- */

app.get("/api/payments", requireAuth, (req, res) =>
  res.json({ payments: db.payments.filter((p) => p.userId === req.user.id) }),
);

app.get("/api/notifications", requireAuth, (req, res) =>
  res.json({ notifications: db.notifications.filter((n) => n.userId === req.user.id).reverse() }),
);

app.post("/api/notifications/read", requireAuth, (req, res) => {
  const id = (req.body || {}).id;
  db.notifications
    .filter((n) => n.userId === req.user.id && (!id || n.id === id))
    .forEach((n) => (n.read = true));
  res.json({ ok: true });
});

/* ---------- Обратная связь ---------- */

app.post("/api/feedback", (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim();
  const message = String(b.message || "").trim();
  if (NAME_RE.test(name) === false) return res.status(400).json({ error: "Укажите имя." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Укажите корректный email." });
  if (message.length < 10) return res.status(400).json({ error: "Сообщение должно быть не короче 10 символов." });
  db.feedback = db.feedback || [];
  db.feedback.push({ id: "F-" + Date.now(), name, email, message, createdAt: fmt(new Date()) });
  notifyAdmins("lead", "Новое сообщение через форму обратной связи от " + name + " (" + email + ").");
  res.json({ ok: true, message: "Сообщение отправлено. Мы ответим на указанный email." });
});

/* ---------- Админка (п. 11 ТЗ) ---------- */

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const paid = db.payments.filter((p) => p.status === "Оплачен");
  const done = db.generationQueue.filter((j) => j.finishedAt);
  const avg = done.length
    ? Math.round(done.reduce((s, j) => s + (j.finishedAt - j.startedAt), 0) / done.length / 1000)
    : 0;
  res.json({
    stats: {
      users: db.users.filter((u) => u.role !== "admin").length,
      orders: db.orders.length,
      byLevel: {
        s: db.orders.filter((o) => o.level === "s").length,
        m: db.orders.filter((o) => o.level === "m").length,
        l: db.orders.filter((o) => o.level === "l").length,
      },
      paidSum: paid.reduce((s, p) => s + p.amount, 0),
      completed: db.orders.filter((o) => o.status === "Готово").length,
      errors: db.orders.filter((o) => o.status === "Ошибка генерации").length,
      avgGenerationSeconds: avg,
      activeGenerations: db.generationQueue.filter((j) => !j.finishedAt).length,
      conversion: db.users.length ? +(db.orders.length / db.users.length).toFixed(2) : 0,
    },
  });
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const list = db.users
    .filter((u) => !q || (u.name || "").toLowerCase().includes(q) || (u.email || "").includes(q) || (u.phone || "").includes(q))
    .map((u) => ({
      ...publicUser(u),
      ordersCount: db.orders.filter((o) => o.userId === u.id).length,
      deleteRequestedAt: u.deleteRequestedAt || null,
    }));
  res.json({ users: list });
});

app.patch("/api/admin/users/:id/block", requireAdmin, (req, res) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "Пользователь не найден." });
  if (user.role === "admin") return res.status(400).json({ error: "Нельзя заблокировать администратора." });
  user.blocked = !!(req.body || {}).blocked;
  if (user.blocked) for (const [t, uid] of db.tokens) if (uid === user.id) db.tokens.delete(t);
  res.json({ user: publicUser(user) });
});

app.get("/api/admin/users/:id/orders", requireAdmin, (req, res) => {
  res.json({ orders: db.orders.filter((o) => o.userId === req.params.id).map(orderSummary) });
});

app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const { q = "", level = "", status = "" } = req.query;
  const query = String(q).trim().toLowerCase();
  const list = db.orders
    .filter((o) => (!query || o.id.toLowerCase().includes(query) || o.parcel.cadastral.includes(query)))
    .filter((o) => (!level || o.level === level))
    .filter((o) => (!status || o.status === status))
    .map((o) => {
      const u = db.users.find((x) => x.id === o.userId);
      return {
        ...orderSummary(o),
        userId: o.userId,
        userName: u ? u.name : "—",
        userEmail: u ? u.email : "—",
        statusHistory: o.statusHistory,
        params: o.params || {},
      };
    });
  res.json({ orders: list, statuses: STATUSES });
});

app.patch("/api/admin/orders/:id/status", requireAdmin, (req, res) => {
  const order = findOrder(req.params.id);
  if (!order) return res.status(404).json({ error: "Заказ не найден." });
  const status = String((req.body || {}).status || "");
  if (!STATUSES.includes(status)) return res.status(400).json({ error: "Недопустимый статус." });
  pushStatus(order, status);
  if (status === "Готово") {
    if (!order.reportId) {
      const report = buildReport(order);
      db.reports[report.id] = report;
      order.reportId = report.id;
    }
    notify(order.userId, "order", "Отчёт по заказу " + order.id + " готов.");
  }
  if (status === "Ошибка генерации" || status === "Требуется вмешательство специалиста")
    notify(order.userId, "order", "По заказу " + order.id + " возникла проблема. Мы уже разбираемся.");
  res.json({ order: orderFull(order) });
});

app.get("/api/admin/generations", requireAdmin, (req, res) => {
  res.json({
    generations: db.generationQueue.map((j) => ({
      id: j.id,
      orderId: j.orderId,
      level: j.level,
      attempts: j.attempts,
      status: j.status,
      startedAt: j.startedAt,
      finishedAt: j.finishedAt,
      durationSeconds: j.finishedAt ? Math.round((j.finishedAt - j.startedAt) / 1000) : null,
    })),
  });
});

app.patch("/api/admin/levels/:id", requireAdmin, (req, res) => {
  const level = db.levels[req.params.id];
  if (!level) return res.status(404).json({ error: "Уровень не найден." });
  const b = req.body || {};
  if (b.price !== undefined) {
    const price = Math.floor(+b.price);
    if (!(price > 0)) return res.status(400).json({ error: "Стоимость должна быть положительным числом." });
    level.price = price;
  }
  if (b.duration !== undefined) level.duration = String(b.duration);
  if (b.tagline !== undefined) level.tagline = String(b.tagline);
  if (b.available !== undefined) level.available = !!b.available;
  /* Уже оплаченные заказы хранят цену в момент создания — изменение тарифа их не затрагивает. */
  res.json({ levels: levelsPublic() });
});

app.put("/api/admin/offer", requireAdmin, (req, res) => {
  const b = req.body || {};
  const version = String(b.version || "").trim();
  if (!version) return res.status(400).json({ error: "Укажите версию оферты." });
  const text = Array.isArray(b.text)
    ? b.text.map((t) => String(t))
    : String(b.text || "").split(/\r?\n/).filter(Boolean);
  if (!text.length) return res.status(400).json({ error: "Текст оферты не может быть пустым." });
  db.offer = { ...db.offer, version, text, updatedAt: fmt(new Date()).split(" ")[0] };
  db.documents = db.documents.map((d) => (d.id === "offer" ? { ...d, updatedAt: db.offer.updatedAt } : d));
  notifyAdmins("system", "Опубликована новая редакция оферты v" + version + ".");
  res.json({ offer: db.offer });
});

/* 404 */
app.use((req, res) => res.status(404).json({ error: "Не найдено." }));

module.exports = app;
