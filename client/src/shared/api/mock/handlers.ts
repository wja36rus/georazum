/*
 * Мок-роутер API «Гео Разум»: обрабатывает запросы клиента без бэкенда.
 * Зеркало server/src/app.js (endpoint-ы, валидация, статусы генерации).
 * Используется только когда включён мок-режим (см. shared/api/client.ts).
 */

import {
  db,
  counters,
  fmt,
  isCadastral,
  ADJACENT,
  distanceBetween,
  type MockCustomer,
  type MockGenJob,
  type MockOrder,
  type MockParcel,
  type MockPayment,
  type MockUser,
  type MockWalletTx,
} from "./data";
import { buildReport } from "./report";

export type MockResponse = { status: number; data: unknown };

type Req = {
  method: string;
  pathname: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  body: unknown;
};

export type MockInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
};

const ok = (data: unknown, status = 200): MockResponse => ({ status, data });
const err = (status: number, error: string): MockResponse => ({
  status,
  data: { error },
});

/* ---------- Хелперы (зеркало app.js) ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/;
const NAME_RE = /^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\-\s]{1,49}$/;
const digits = (v: unknown): string =>
  String(v == null ? "" : v).replace(/\D/g, "");

const publicUser = (u: MockUser) => ({
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

const orderSummary = (o: MockOrder) => ({
  id: o.id,
  cadastral: o.parcels[0]?.cadastral || o.parcel.cadastral,
  parcelCount: o.parcels.length,
  level: o.level,
  levelName: db.levels[o.level]?.name || o.level,
  price: o.price,
  status: o.status,
  createdAt: o.createdAt,
  paidAt: o.paidAt || null,
  reportId: o.reportId || null,
});

const orderFull = (o: MockOrder) => {
  const payment =
    [...db.payments].reverse().find((p) => p.orderId === o.id) || null;
  return {
    ...orderSummary(o),
    parcels: o.parcels,
    parcel: o.parcel,
    customer: o.customer || null,
    params: o.params || {},
    offer: o.offer,
    statusHistory: o.statusHistory,
    transactionId: o.transactionId || null,
    generationAttempts: o.generationAttempts || 0,
    payment,
  };
};

const tokenFrom = (req: Req): string => {
  const h = req.headers.Authorization || req.headers.authorization || "";
  return h.replace(/^Bearer\s+/i, "").trim();
};

const authUser = (req: Req): MockUser | null => {
  const token = tokenFrom(req);
  const userId = token ? db.tokens.get(token) : undefined;
  return (userId && db.users.find((u) => u.id === userId)) || null;
};

const issueToken = (user: MockUser): string => {
  const token =
    "mock-tok-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10);
  db.tokens.set(token, user.id);
  return token;
};

/** Возвращает пользователя или ответ с ошибкой (401/403). */
const requireAuth = (req: Req): { user: MockUser; error?: MockResponse } => {
  const user = authUser(req);
  if (!user)
    return { user: null as never, error: err(401, "Требуется авторизация.") };
  if (user.blocked)
    return {
      user: null as never,
      error: err(403, "Аккаунт заблокирован. Обратитесь в поддержку."),
    };
  return { user };
};

const requireAdmin = (req: Req): { user: MockUser; error?: MockResponse } => {
  const { user, error } = requireAuth(req);
  if (error) return { user: user as never, error };
  if (user.role !== "admin")
    return {
      user: user as never,
      error: err(403, "Доступ только для администратора."),
    };
  return { user };
};

const findOrder = (id: string): MockOrder | undefined =>
  db.orders.find((o) => o.id === id);
const ownsOrder = (user: MockUser, order: MockOrder): boolean =>
  user.role === "admin" || order.userId === user.id;

type NotifyType =
  "order" | "payment" | "account" | "email" | "lead" | "system" | "user";

const notify = (userId: string, type: NotifyType, text: string) => {
  db.notifications.push({
    id: "n" + Date.now() + "-" + Math.random().toString(16).slice(2, 6),
    userId,
    type,
    text,
    createdAt: fmt(),
    read: false,
  });
};

const notifyAdmins = (type: NotifyType, text: string) => {
  db.users
    .filter((u) => u.role === "admin")
    .forEach((a) => notify(a.id, type, text));
};

const pushStatus = (order: MockOrder, status: string) => {
  const entry = { status, at: fmt() };
  order.statusHistory.push(entry);
  order.status = status;
  return entry;
};

/* ---------- Личный счёт (кошелёк) ---------- */

/** Операции пользователя: новые сверху. */
const walletTxs = (userId: string): MockWalletTx[] =>
  db.transactions
    .filter((t) => t.userId === userId)
    .slice()
    .reverse();

/** Публичное представление пользователя для админ-счётчика. */
const walletPublic = (u: MockUser) => ({
  id: u.id,
  name: u.firstName + " " + u.lastName,
  email: u.email,
  balance: u.balance,
});

/** Валидация суммы пополнения/списания: число рублей. */
const amountError = (v: unknown, min: number, max: number): string => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "Укажите сумму числом.";
  if (n < min || n > max)
    return (
      "Сумма должна быть от " +
      min.toLocaleString("ru-RU") +
      " до " +
      max.toLocaleString("ru-RU") +
      " ₽."
    );
  return "";
};

/** Списание с личного счёта за заказ + запись операции. */
function debitWallet(user: MockUser, order: MockOrder): MockWalletTx {
  user.balance -= order.price;
  const tx: MockWalletTx = {
    id: counters.nextTx(),
    userId: user.id,
    type: "debit",
    amount: order.price,
    balanceAfter: user.balance,
    orderId: order.id,
    description:
      "Оплата заказа " +
      order.id +
      " (уровень " +
      order.level.toUpperCase() +
      ")",
    createdAt: fmt(),
  };
  db.transactions.unshift(tx);
  return tx;
}

/** Пополнение личного счёта + запись операции. */
function topupWallet(
  user: MockUser,
  amount: number,
  description: string,
): MockWalletTx {
  user.balance += amount;
  const tx: MockWalletTx = {
    id: counters.nextTx(),
    userId: user.id,
    type: "topup",
    amount,
    balanceAfter: user.balance,
    description,
    createdAt: fmt(),
  };
  db.transactions.unshift(tx);
  return tx;
}

const STATUSES = [
  "Заказ создан",
  "Ожидает оплаты",
  "Оплачен",
  "Передан в обработку",
  "Сбор исходных данных",
  "Выполняется анализ",
  "Формируется PDF",
  "Готово",
  "Ошибка генерации",
  "Требуется вмешательство специалиста",
];

/* ---------- Участки: проверка взаимного расположения (п. 2.4 User Journey) ---------- */

const uniqueCadastrals = (list: string[]): string[] =>
  Array.from(new Set(list.map((s) => s.trim()).filter(Boolean)));

/** Проверка списка кадастровых номеров: формат + наличие в источнике. */
function resolveParcels(raw: string[]): {
  parcels: MockParcel[];
  error?: MockResponse;
} {
  const cadastrals = uniqueCadastrals(raw);
  if (cadastrals.length === 0)
    return {
      parcels: [],
      error: err(400, "Укажите хотя бы один кадастровый номер."),
    };
  if (cadastrals.length > 10)
    return {
      parcels: [],
      error: err(400, "Максимум 10 участков в одном заказе."),
    };
  for (const c of cadastrals) {
    if (!isCadastral(c))
      return {
        parcels: [],
        error: err(
          400,
          "Кадастровый номер " +
            c +
            " должен быть в формате XX:XX:XXXXXXX:XXX.",
        ),
      };
    if (!db.parcels[c])
      return {
        parcels: [],
        error: err(
          404,
          "Участок " +
            c +
            " не найден в доступных источниках. Проверьте номер.",
        ),
      };
  }
  return { parcels: cadastrals.map((c) => db.parcels[c]) };
}

/** Суммарная площадь участков заказа, «N м²». */
export const totalArea = (parcels: MockParcel[]): string => {
  const sum = parcels.reduce((acc, p) => acc + (p.areaSqm || 0), 0);
  return sum.toLocaleString("ru-RU") + " м²";
};

/* ---------- Генерация (зеркало generation.js, но короче по времени) ---------- */

const timers = new Map<string, number[]>();

function clearTimers(orderId: string) {
  (timers.get(orderId) || []).forEach((t) => clearTimeout(t));
  timers.set(orderId, []);
}

function startGeneration(order: MockOrder) {
  clearTimers(order.id);
  const user = db.users.find((u) => u.id === order.userId);

  const job: MockGenJob = {
    id: counters.nextGen(),
    orderId: order.id,
    level: order.level,
    attempts: (order.generationAttempts || 0) + 1,
    startedAt: new Date(),
    finishedAt: null,
    status: "Передан в обработку",
    error: null,
  };
  order.generationAttempts = job.attempts;
  db.generationQueue.unshift(job);

  pushStatus(order, "Передан в обработку");
  if (user)
    notify(
      user.id,
      "order",
      "Заказ " + order.id + " передан в аналитический модуль.",
    );

  const step = (delay: number, status: string) => {
    const t = window.setTimeout(() => {
      const current = db.orders.find((o) => o.id === order.id);
      if (
        !current ||
        current.status === "Готово" ||
        current.status === "Ошибка генерации"
      )
        return;
      pushStatus(current, status);
      job.status = status;
    }, delay);
    (timers.get(order.id) || []).push(t);
    if (!timers.get(order.id)) timers.set(order.id, [t]);
  };

  const finish = window.setTimeout(() => {
    const current = db.orders.find((o) => o.id === order.id);
    if (!current || current.status === "Ошибка генерации") return;
    const report = buildReport(current);
    db.reports[report.id] = report;
    current.reportId = report.id;
    pushStatus(current, "Готово");
    job.status = "Готово";
    job.finishedAt = new Date();
    if (user)
      notify(
        user.id,
        "order",
        "Отчёт по заказу " +
          order.id +
          " готов: доступен в разделе «Мои отчёты».",
      );
    notifyAdmins(
      "system",
      "Генерация по заказу " + order.id + " завершена успешно.",
    );
  }, 4200);
  (timers.get(order.id) || []).push(finish);
  timers.set(order.id, timers.get(order.id) || [finish]);

  step(900, "Сбор исходных данных");
  step(1800, "Выполняется анализ");
  step(3000, "Формируется PDF");
}

const retryGeneration = (order: MockOrder) => {
  order.statusHistory = order.statusHistory || [];
  order.reportId = null;
  startGeneration(order);
  return order;
};

/* ---------- Валидация карты ---------- */

const cardValid = (card: unknown): string => {
  const c = (card || {}) as Record<string, unknown>;
  const number = digits(c.number);
  if (number.length !== 16) return "Номер карты должен содержать 16 цифр.";
  const exp = digits(c.expiry);
  if (exp.length !== 4) return "Срок действия карты — формат ММ/ГГ.";
  const month = +exp.slice(0, 2);
  const year = 2000 + +exp.slice(2);
  const d = new Date();
  if (month < 1 || month > 12) return "Некорректный месяц срока действия.";
  if (
    year < d.getFullYear() ||
    (year === d.getFullYear() && month < d.getMonth() + 1)
  )
    return "Срок действия карты истёк.";
  if (digits(c.cvv).length !== 3) return "CVV должен содержать 3 цифры.";
  if (String(c.holder || "").trim().length < 3)
    return "Укажите имя владельца карты.";
  return "";
};

/* ---------- Обработчики ---------- */

function handle(req: Req): MockResponse {
  const { method, pathname, query } = req;
  const b = (req.body || {}) as Record<string, unknown>;
  const str = (v: unknown) => String(v == null ? "" : v);

  /* Служебное */
  if (method === "GET" && pathname === "/api/health") {
    return ok({ ok: true, service: "georazum", time: fmt() });
  }

  /* Авторизация и профиль */
  if (method === "POST" && pathname === "/api/auth/register") {
    const firstName = str(b.firstName).trim();
    const lastName = str(b.lastName).trim();
    const email = str(b.email).trim().toLowerCase();
    const phone = str(b.phone).trim();
    const password = str(b.password);
    const confirmPassword = str(b.confirmPassword);

    if (!NAME_RE.test(firstName))
      return err(400, "Укажите имя (только буквы, от 2 символов).");
    if (!NAME_RE.test(lastName))
      return err(400, "Укажите фамилию (только буквы, от 2 символов).");
    if (!EMAIL_RE.test(email)) return err(400, "Укажите корректный email.");
    if (digits(phone).length !== 11)
      return err(400, "Телефон должен содержать 11 цифр.");
    if (password.length < 8)
      return err(400, "Пароль должен быть не короче 8 символов.");
    if (password !== confirmPassword) return err(400, "Пароли не совпадают.");
    if (!b.consentPd || !b.consentTerms)
      return err(
        400,
        "Необходимо согласие на обработку персональных данных и с условиями.",
      );
    if (db.users.some((u) => u.email === email))
      return err(409, "Пользователь с таким email уже зарегистрирован.");

    const user: MockUser = {
      id: counters.nextUser(),
      firstName,
      lastName,
      email,
      phone,
      password,
      role: "user",
      blocked: false,
      confirmed: true,
      createdAt: fmt(),
      deleteRequestedAt: null,
      balance: 0,
    };
    db.users.push(user);
    notify(
      user.id,
      "account",
      "Добро пожаловать в Гео Разум! Аккаунт создан, email подтверждён (демо).",
    );
    notifyAdmins(
      "user",
      "Новая регистрация: " +
        user.firstName +
        " " +
        user.lastName +
        " (" +
        email +
        ").",
    );
    return ok({ token: issueToken(user), user: publicUser(user) }, 201);
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const email = str(b.email).trim().toLowerCase();
    const password = str(b.password);
    const user = db.users.find((u) => u.email === email);
    if (!user || user.password !== password)
      return err(401, "Неверный email или пароль.");
    if (user.blocked)
      return err(403, "Аккаунт заблокирован. Обратитесь в поддержку.");
    return ok({ token: issueToken(user), user: publicUser(user) });
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    const { error } = requireAuth(req);
    if (error) return error;
    db.tokens.delete(tokenFrom(req));
    return ok({ ok: true });
  }

  if (method === "GET" && pathname === "/api/auth/me") {
    const { user, error } = requireAuth(req);
    if (error) return error;
    return ok({ user: publicUser(user) });
  }

  if (method === "PATCH" && pathname === "/api/auth/profile") {
    const { user, error } = requireAuth(req);
    if (error) return error;
    if (b.firstName !== undefined) {
      if (!NAME_RE.test(str(b.firstName).trim()))
        return err(400, "Некорректное имя.");
      user.firstName = str(b.firstName).trim();
    }
    if (b.lastName !== undefined) {
      if (!NAME_RE.test(str(b.lastName).trim()))
        return err(400, "Некорректная фамилия.");
      user.lastName = str(b.lastName).trim();
    }
    if (b.phone !== undefined) {
      if (digits(b.phone).length !== 11)
        return err(400, "Телефон должен содержать 11 цифр.");
      user.phone = str(b.phone).trim();
    }
    if (b.email !== undefined) {
      const email = str(b.email).trim().toLowerCase();
      if (!EMAIL_RE.test(email)) return err(400, "Некорректный email.");
      if (db.users.some((u) => u.email === email && u.id !== user.id))
        return err(409, "Этот email уже используется.");
      user.email = email;
    }
    return ok({ user: publicUser(user) });
  }

  if (method === "PATCH" && pathname === "/api/auth/password") {
    const { user, error } = requireAuth(req);
    if (error) return error;
    if (str(b.currentPassword) !== user.password)
      return err(400, "Текущий пароль указан неверно.");
    if (str(b.newPassword).length < 8)
      return err(400, "Новый пароль должен быть не короче 8 символов.");
    user.password = str(b.newPassword);
    for (const [token, userId] of db.tokens)
      if (userId === user.id) db.tokens.delete(token);
    return ok({ ok: true, token: issueToken(user) });
  }

  if (method === "POST" && pathname === "/api/auth/recovery") {
    const email = str(b.email).trim().toLowerCase();
    const user = db.users.find((u) => u.email === email);
    if (user)
      notify(
        user.id,
        "account",
        "Запрошено восстановление пароля. Письмо отправлено на " + email + ".",
      );
    return ok({
      ok: true,
      message: "Если email зарегистрирован, письмо со ссылкой отправлено.",
    });
  }

  if (method === "POST" && pathname === "/api/auth/delete-request") {
    const { user, error } = requireAuth(req);
    if (error) return error;
    if (str(b.password) !== user.password)
      return err(400, "Пароль указан неверно.");
    user.deleteRequestedAt = fmt();
    notifyAdmins(
      "account",
      "Запрос на удаление аккаунта: " +
        user.firstName +
        " " +
        user.lastName +
        " (" +
        user.email +
        ").",
    );
    return ok({
      ok: true,
      message:
        "Запрос на удаление аккаунта принят. С вами свяжутся для подтверждения.",
    });
  }

  /* Каталог: уровни, оферта, документы */
  if (method === "GET" && pathname === "/api/levels")
    return ok({ levels: levelsPublic() });

  if (method === "GET" && pathname === "/api/offer")
    return ok({ offer: db.offer });

  if (method === "GET" && pathname === "/api/documents") {
    return ok({
      documents: db.documents.map((d) => ({
        id: d.id,
        title: d.title,
        updatedAt: d.updatedAt,
      })),
    });
  }

  const docMatch = pathname.match(/^\/api\/documents\/([^/]+)$/);
  if (method === "GET" && docMatch) {
    const doc = db.documents.find((d) => d.id === docMatch[1]);
    if (!doc) return err(404, "Документ не найден.");
    const text = doc.id === "offer" ? db.offer.text : [];
    return ok({ document: { ...doc, text } });
  }

  if (method === "GET" && pathname === "/api/examples/report") {
    const o: MockOrder = {
      id: "DEMO",
      level: "l",
      price: db.levels.l.price,
      parcels: [db.parcels["36:25:6945030:776"]],
      parcel: db.parcels["36:25:6945030:776"],
      customer: null,
      params: {
        direction: "Лесной ретрит «Тихая поляна»",
        budget: "90–120 млн ₽",
        payback: "96 месяцев",
        yield: "18% годовых",
        objects: "Глэмпинг на 89 мест + ресторан",
      },
      userId: "",
      status: "",
      statusHistory: [],
      offer: { version: "", acceptedAt: "" },
      createdAt: "",
      paidAt: null,
      reportId: null,
      transactionId: null,
      generationAttempts: 0,
    };
    return ok({ report: buildReport(o) });
  }

  /* Участки */
  const mutualMatch = method === "POST" && pathname === "/api/parcels/mutual";
  if (mutualMatch) {
    const { error } = requireAuth(req);
    if (error) return error;
    const raw = Array.isArray(b.cadastrals) ? b.cadastrals : [b.cadastral];
    const { parcels, error: resolveError } = resolveParcels(
      (raw as string[]).map((x) => str(x)),
    );
    if (resolveError) return resolveError;

    const pairs: {
      a: string;
      b: string;
      adjacent: boolean;
      distance: string;
    }[] = [];
    for (let i = 0; i < parcels.length; i++) {
      for (let j = i + 1; j < parcels.length; j++) {
        const a = parcels[i].cadastral;
        const bNum = parcels[j].cadastral;
        const adjacent = (ADJACENT[a] || []).includes(bNum);
        const m = adjacent ? 0 : distanceBetween(a, bNum);
        pairs.push({
          a,
          b: bNum,
          adjacent,
          distance: adjacent
            ? ""
            : m >= 1000
              ? (m / 1000).toFixed(1) + " км"
              : m + " м",
        });
      }
    }
    const allAdjacent = pairs.every((p) => p.adjacent);
    return ok({
      parcels,
      totalArea: totalArea(parcels),
      count: parcels.length,
      allAdjacent,
      pairs,
    });
  }

  const parcelMatch = pathname.match(/^\/api\/parcels\/([^/]+)$/);
  if (method === "GET" && parcelMatch) {
    const { error } = requireAuth(req);
    if (error) return error;
    const cadastral = str(parcelMatch[1]).trim();
    if (!isCadastral(cadastral))
      return err(
        400,
        "Кадастровый номер должен быть в формате XX:XX:XXXXXXX:XXX.",
      );
    const parcel = db.parcels[cadastral];
    if (!parcel)
      return err(
        404,
        "Участок не найден в доступных источниках. Проверьте номер.",
      );
    return ok({ parcel });
  }

  /* Заказы */
  if (method === "POST" && pathname === "/api/orders") {
    const { user, error } = requireAuth(req);
    if (error) return error;
    const levelId = str(b.level).toLowerCase();

    /* Один участок (старый формат) или несколько (п. 2.1 User Journey). */
    const rawList = Array.isArray(b.cadastrals) ? b.cadastrals : [b.cadastral];
    const { parcels, error: parcelsError } = resolveParcels(
      (rawList as string[]).map((x) => str(x)),
    );
    if (parcelsError) return parcelsError;

    const level = db.levels[levelId as keyof typeof db.levels];
    if (!level) return err(400, "Выберите уровень анализа S, M или L.");
    if (level.available === false)
      return err(400, "Этот уровень временно недоступен.");
    if (b.offerAccepted !== true)
      return err(400, "Необходимо принять условия публичной оферты.");
    if (str(b.offerVersion) !== db.offer.version)
      return err(
        409,
        "Оферта обновилась. Ознакомьтесь с новой редакцией v" +
          db.offer.version +
          ".",
      );

    const customer = (b.customer as MockCustomer | undefined) ?? null;
    if (customer && !str(customer.email).trim())
      return err(400, "Email заказчика обязателен.");

    const order: MockOrder = {
      id: counters.nextOrder(),
      userId: user.id,
      parcels,
      parcel: parcels[0],
      level: level.id,
      price: level.price,
      status: "Ожидает оплаты",
      statusHistory: [
        { status: "Заказ создан", at: fmt() },
        { status: "Ожидает оплаты", at: fmt() },
      ],
      params:
        level.id === "s"
          ? {}
          : {
              ...((b.params as Record<string, string>) || {}),
              ...(customer ? { customerEmail: str(customer.email) } : {}),
            },
      customer,
      offer: { version: db.offer.version, acceptedAt: fmt() },
      createdAt: fmt(),
      paidAt: null,
      reportId: null,
      transactionId: null,
      generationAttempts: 0,
    };
    db.orders.unshift(order);
    notify(user.id, "order", "Заказ " + order.id + " создан. Ожидает оплаты.");
    return ok({ order: orderFull(order) }, 201);
  }

  if (method === "GET" && pathname === "/api/orders") {
    const { user, error } = requireAuth(req);
    if (error) return error;
    return ok({
      orders: db.orders.filter((o) => o.userId === user.id).map(orderSummary),
    });
  }

  const orderMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (method === "GET" && orderMatch) {
    const { user, error } = requireAuth(req);
    if (error) return error;
    const order = findOrder(orderMatch[1]);
    if (!order || !ownsOrder(user, order)) return err(404, "Заказ не найден.");
    return ok({ order: orderFull(order) });
  }

  const payMatch = pathname.match(/^\/api\/orders\/([^/]+)\/pay$/);
  if (method === "POST" && payMatch) {
    const { user, error } = requireAuth(req);
    if (error) return error;
    const order = findOrder(payMatch[1]);
    if (!order || !ownsOrder(user, order)) return err(404, "Заказ не найден.");
    if (order.paidAt)
      return err(400, "Заказ уже оплачен. Повторное списание не выполняется.");

    /* Оплата с личного счёта (без карты). */
    if (b.fromBalance === true) {
      if (user.balance < order.price)
        return err(
          400,
          "Недостаточно средств на счёте. Пополните счёт в личном кабинете.",
        );
      const transactionId = "bal-" + Math.random().toString(16).slice(2, 14);
      debitWallet(user, order);
      const payment: MockPayment = {
        id: counters.nextPayment(),
        orderId: order.id,
        userId: user.id,
        amount: order.price,
        method: "balance",
        status: "Оплачен",
        createdAt: fmt(),
        transactionId,
      };
      db.payments.unshift(payment);
      order.paidAt = fmt();
      order.transactionId = transactionId;
      pushStatus(order, "Оплачен");
      notify(
        user.id,
        "payment",
        "Оплата заказа " +
          order.id +
          " на " +
          order.price.toLocaleString("ru-RU") +
          " ₽ списана с личного счёта.",
      );
      notifyAdmins(
        "payment",
        "Новый оплаченный заказ " +
          order.id +
          " (" +
          order.level.toUpperCase() +
          ") на сумму " +
          order.price.toLocaleString("ru-RU") +
          " ₽ (личный счёт).",
      );
      startGeneration(order);
      return ok({
        order: orderFull(order),
        payment,
        balance: user.balance,
      });
    }

    const cardError = cardValid(b.card);
    if (cardError) return err(400, "Платёж отклонён: " + cardError);

    const number = digits((b.card as Record<string, unknown>)?.number);
    const transactionId = "txn-" + Math.random().toString(16).slice(2, 14);

    if (number === "0000000000000000") {
      const failed: MockPayment = {
        id: counters.nextPayment(),
        orderId: order.id,
        userId: user.id,
        amount: order.price,
        method: "card",
        status: "Ошибка",
        createdAt: fmt(),
        transactionId,
      };
      db.payments.unshift(failed);
      pushStatus(order, "Ожидает оплаты");
      notify(
        user.id,
        "payment",
        "Оплата заказа " +
          order.id +
          " отклонена банком. Попробуйте другую карту.",
      );
      return err(402, "Платёж отклонён банком. Попробуйте другую карту.");
    }

    const payment: MockPayment = {
      id: counters.nextPayment(),
      orderId: order.id,
      userId: user.id,
      amount: order.price,
      method: "card",
      status: "Оплачен",
      createdAt: fmt(),
      transactionId,
    };
    db.payments.unshift(payment);
    order.paidAt = fmt();
    order.transactionId = transactionId;
    pushStatus(order, "Оплачен");
    notify(
      user.id,
      "payment",
      "Оплата заказа " +
        order.id +
        " на " +
        order.price.toLocaleString("ru-RU") +
        " ₽ прошла успешно.",
    );
    notifyAdmins(
      "payment",
      "Новый оплаченный заказ " +
        order.id +
        " (" +
        order.level.toUpperCase() +
        ") на сумму " +
        order.price.toLocaleString("ru-RU") +
        " ₽.",
    );
    startGeneration(order);

    return ok({ order: orderFull(order), payment });
  }

  const retryMatch = pathname.match(/^\/api\/orders\/([^/]+)\/retry$/);
  if (method === "POST" && retryMatch) {
    const { user, error } = requireAuth(req);
    if (error) return error;
    const order = findOrder(retryMatch[1]);
    if (!order || !ownsOrder(user, order)) return err(404, "Заказ не найден.");
    const retryable =
      order.status === "Ошибка генерации" ||
      order.status === "Требуется вмешательство специалиста";
    if (!retryable && user.role !== "admin")
      return err(400, "Повторный запуск доступен только при ошибке генерации.");
    retryGeneration(order);
    notify(
      user.id,
      "order",
      "Генерация по заказу " + order.id + " запущена повторно.",
    );
    return ok({ order: orderFull(order) });
  }

  const resendMatch = pathname.match(/^\/api\/orders\/([^/]+)\/resend-report$/);
  if (method === "POST" && resendMatch) {
    const { user, error } = requireAuth(req);
    if (error) return error;
    const order = findOrder(resendMatch[1]);
    if (!order || !ownsOrder(user, order)) return err(404, "Заказ не найден.");
    if (!order.reportId) return err(400, "Отчёт ещё не сформирован.");
    notify(
      user.id,
      "email",
      "Отчёт по заказу " +
        order.id +
        " повторно отправлен на " +
        user.email +
        ".",
    );
    return ok({ ok: true, to: user.email });
  }

  const reportMatch = pathname.match(/^\/api\/orders\/([^/]+)\/report$/);
  if (method === "GET" && reportMatch) {
    const { user, error } = requireAuth(req);
    if (error) return error;
    const order = findOrder(reportMatch[1]);
    if (!order || !ownsOrder(user, order)) return err(404, "Заказ не найден.");
    if (!order.reportId) return err(404, "Отчёт ещё не готов.");
    if (!db.reports[order.reportId])
      db.reports[order.reportId] = buildReport(order);
    return ok({ report: db.reports[order.reportId] });
  }

  /* Платежи и уведомления */
  if (method === "GET" && pathname === "/api/payments") {
    const { user, error } = requireAuth(req);
    if (error) return error;
    return ok({ payments: db.payments.filter((p) => p.userId === user.id) });
  }

  /* Личный счёт: баланс и история операций */
  if (method === "GET" && pathname === "/api/wallet") {
    const { user, error } = requireAuth(req);
    if (error) return error;
    return ok({ balance: user.balance, transactions: walletTxs(user.id) });
  }

  if (method === "POST" && pathname === "/api/wallet/topup") {
    const { user, error } = requireAuth(req);
    if (error) return error;
    const amountErrorText = amountError(b.amount, 100, 500000);
    if (amountErrorText) return err(400, amountErrorText);
    const cardErrorText = cardValid(b.card);
    if (cardErrorText) return err(400, "Платёж отклонён: " + cardErrorText);
    const number = digits((b.card as Record<string, unknown>)?.number);
    if (number === "0000000000000000")
      return err(402, "Платёж отклонён банком. Попробуйте другую карту.");
    const amount = Math.round(Number(b.amount));
    const tx = topupWallet(user, amount, "Пополнение счёта");
    notify(
      user.id,
      "account",
      "Счёт пополнен на " + amount.toLocaleString("ru-RU") + " ₽.",
    );
    return ok({ balance: user.balance, transaction: tx });
  }

  if (method === "GET" && pathname === "/api/notifications") {
    const { user, error } = requireAuth(req);
    if (error) return error;
    return ok({
      notifications: db.notifications
        .filter((n) => n.userId === user.id)
        .reverse(),
    });
  }

  if (method === "POST" && pathname === "/api/notifications/read") {
    const { user, error } = requireAuth(req);
    if (error) return error;
    const id = str(b.id) || undefined;
    db.notifications
      .filter((n) => n.userId === user.id && (!id || n.id === id))
      .forEach((n) => (n.read = true));
    return ok({ ok: true });
  }

  /* Обратная связь */
  if (method === "POST" && pathname === "/api/feedback") {
    const name = str(b.name).trim();
    const email = str(b.email).trim();
    const message = str(b.message).trim();
    if (!NAME_RE.test(name)) return err(400, "Укажите имя.");
    if (!EMAIL_RE.test(email)) return err(400, "Укажите корректный email.");
    if (message.length < 10)
      return err(400, "Сообщение должно быть не короче 10 символов.");
    notifyAdmins(
      "lead",
      "Новое сообщение через форму обратной связи от " +
        name +
        " (" +
        email +
        ").",
    );
    return ok({
      ok: true,
      message: "Сообщение отправлено. Мы ответим на указанный email.",
    });
  }

  /* Админка */
  if (method === "GET" && pathname === "/api/admin/stats") {
    const { error, user } = requireAdmin(req);
    if (error) {
      void user;
      return error;
    }
    const paid = db.payments.filter((p) => p.status === "Оплачен");
    const done = db.generationQueue.filter((j) => j.finishedAt);
    const avg = done.length
      ? Math.round(
          done.reduce(
            (s, j) =>
              s + ((j.finishedAt as Date).getTime() - j.startedAt.getTime()),
            0,
          ) /
            done.length /
            1000,
        )
      : 0;
    return ok({
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
        activeGenerations: db.generationQueue.filter((j) => !j.finishedAt)
          .length,
        conversion: db.users.length
          ? +(db.orders.length / db.users.length).toFixed(2)
          : 0,
      },
    });
  }

  if (method === "GET" && pathname === "/api/admin/users") {
    const { error } = requireAdmin(req);
    if (error) return error;
    const q = (query.get("q") || "").trim().toLowerCase();
    const list = db.users
      .filter(
        (u) =>
          !q ||
          (u.firstName + " " + u.lastName).toLowerCase().includes(q) ||
          u.email.includes(q) ||
          u.phone.includes(q),
      )
      .map((u) => ({
        ...publicUser(u),
        ordersCount: db.orders.filter((o) => o.userId === u.id).length,
        deleteRequestedAt: u.deleteRequestedAt || null,
        balance: u.balance,
      }));
    return ok({ users: list });
  }

  const blockMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/block$/);
  if (method === "PATCH" && blockMatch) {
    const { error } = requireAdmin(req);
    if (error) return error;
    const user = db.users.find((u) => u.id === blockMatch[1]);
    if (!user) return err(404, "Пользователь не найден.");
    if (user.role === "admin")
      return err(400, "Нельзя заблокировать администратора.");
    user.blocked = Boolean(b.blocked);
    if (user.blocked)
      for (const [t, uid] of db.tokens)
        if (uid === user.id) db.tokens.delete(t);
    return ok({ user: publicUser(user) });
  }

  /* Счёт выбранного пользователя: история и пополнение техподдержкой. */
  const userWalletMatch = pathname.match(
    /^\/api\/admin\/users\/([^/]+)\/wallet$/,
  );
  if (method === "GET" && userWalletMatch) {
    const { error } = requireAdmin(req);
    if (error) return error;
    const user = db.users.find((u) => u.id === userWalletMatch[1]);
    if (!user) return err(404, "Пользователь не найден.");
    return ok({
      user: walletPublic(user),
      transactions: walletTxs(user.id),
    });
  }

  const adminTopupMatch = pathname.match(
    /^\/api\/admin\/users\/([^/]+)\/topup$/,
  );
  if (method === "POST" && adminTopupMatch) {
    const { error } = requireAdmin(req);
    if (error) return error;
    const user = db.users.find((u) => u.id === adminTopupMatch[1]);
    if (!user) return err(404, "Пользователь не найден.");
    const amountErrorText = amountError(b.amount, 1, 1000000);
    if (amountErrorText) return err(400, amountErrorText);
    const amount = Math.round(Number(b.amount));
    const tx = topupWallet(user, amount, "Пополнение счёта службой поддержки");
    notify(
      user.id,
      "account",
      "Ваш счёт пополнен на " +
        amount.toLocaleString("ru-RU") +
        " ₽ службой поддержки.",
    );
    return ok({ user: walletPublic(user), transaction: tx });
  }

  const userOrdersMatch = pathname.match(
    /^\/api\/admin\/users\/([^/]+)\/orders$/,
  );
  if (method === "GET" && userOrdersMatch) {
    const { error } = requireAdmin(req);
    if (error) return error;
    return ok({
      orders: db.orders
        .filter((o) => o.userId === userOrdersMatch[1])
        .map(orderSummary),
    });
  }

  if (method === "GET" && pathname === "/api/admin/orders") {
    const { error } = requireAdmin(req);
    if (error) return error;
    const q = (query.get("q") || "").trim().toLowerCase();
    const level = query.get("level") || "";
    const status = query.get("status") || "";
    const list = db.orders
      .filter(
        (o) =>
          !q ||
          o.id.toLowerCase().includes(q) ||
          o.parcel.cadastral.includes(q),
      )
      .filter((o) => !level || o.level === level)
      .filter((o) => !status || o.status === status)
      .map((o) => {
        const u = db.users.find((x) => x.id === o.userId);
        return {
          ...orderSummary(o),
          userId: o.userId,
          userName: u ? u.firstName + " " + u.lastName : "—",
          userEmail: u ? u.email : "—",
          statusHistory: o.statusHistory,
          params: o.params || {},
        };
      });
    return ok({ orders: list, statuses: STATUSES });
  }

  const adminOrderStatusMatch = pathname.match(
    /^\/api\/admin\/orders\/([^/]+)\/status$/,
  );
  if (method === "PATCH" && adminOrderStatusMatch) {
    const { error } = requireAdmin(req);
    if (error) return error;
    const order = findOrder(adminOrderStatusMatch[1]);
    if (!order) return err(404, "Заказ не найден.");
    const status = str(b.status);
    if (!STATUSES.includes(status)) return err(400, "Недопустимый статус.");
    pushStatus(order, status);
    if (status === "Готово") {
      if (!order.reportId) {
        const report = buildReport(order);
        db.reports[report.id] = report;
        order.reportId = report.id;
      }
      notify(order.userId, "order", "Отчёт по заказу " + order.id + " готов.");
    }
    if (
      status === "Ошибка генерации" ||
      status === "Требуется вмешательство специалиста"
    )
      notify(
        order.userId,
        "order",
        "По заказу " + order.id + " возникла проблема. Мы уже разбираемся.",
      );
    return ok({ order: orderFull(order) });
  }

  if (method === "GET" && pathname === "/api/admin/generations") {
    const { error } = requireAdmin(req);
    if (error) return error;
    return ok({
      generations: db.generationQueue.map((j) => ({
        id: j.id,
        orderId: j.orderId,
        level: j.level,
        attempts: j.attempts,
        status: j.status,
        startedAt: j.startedAt,
        finishedAt: j.finishedAt,
        durationSeconds: j.finishedAt
          ? Math.round((j.finishedAt.getTime() - j.startedAt.getTime()) / 1000)
          : null,
      })),
    });
  }

  const levelMatch = pathname.match(/^\/api\/admin\/levels\/([^/]+)$/);
  if (method === "PATCH" && levelMatch) {
    const { error } = requireAdmin(req);
    if (error) return error;
    const level = db.levels[levelMatch[1] as keyof typeof db.levels];
    if (!level) return err(404, "Уровень не найден.");
    if (b.price !== undefined) {
      const price = Math.floor(Number(b.price));
      if (!(price > 0))
        return err(400, "Стоимость должна быть положительным числом.");
      level.price = price;
    }
    if (b.duration !== undefined) level.duration = str(b.duration);
    if (b.tagline !== undefined) level.tagline = str(b.tagline);
    if (b.available !== undefined) level.available = Boolean(b.available);
    return ok({ levels: levelsPublic() });
  }

  if (method === "PUT" && pathname === "/api/admin/offer") {
    const { error } = requireAdmin(req);
    if (error) return error;
    const version = str(b.version).trim();
    if (!version) return err(400, "Укажите версию оферты.");
    const text = Array.isArray(b.text)
      ? b.text.map((t) => String(t))
      : str(b.text).split(/\r?\n/).filter(Boolean);
    if (!text.length) return err(400, "Текст оферты не может быть пустым.");
    db.offer = { ...db.offer, version, text, updatedAt: fmt().split(" ")[0] };
    db.documents = db.documents.map((d) =>
      d.id === "offer" ? { ...d, updatedAt: db.offer.updatedAt } : d,
    );
    notifyAdmins(
      "system",
      "Опубликована новая редакция оферты v" + version + ".",
    );
    return ok({ offer: db.offer });
  }

  return err(404, "Не найдено.");
}

/** Единая точка входа мок-API: полный аналог fetch(...).json(). */
export async function mockFetch(
  path: string,
  init: MockInit = {},
): Promise<MockResponse> {
  const method = (init.method || "GET").toUpperCase();
  const url = new URL(path, "http://mock.local");
  const req: Req = {
    method,
    pathname: url.pathname,
    query: url.searchParams,
    headers: init.headers || {},
    body: init.body === undefined ? undefined : JSON.parse(init.body || "{}"),
  };

  const result = handle(req);

  /* Имитация сетевой задержки, чтобы UI чувствовал себя как с реальным API. */
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
  return result;
}
