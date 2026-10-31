"use strict";

/*
 * Движок статусов генерации (п. 8.3 ТЗ).
 * В проде — асинхронная очередь (Bull/Redis) + реальный аналитический модуль.
 * ponytail: здесь setTimeout в процессе процесса-сервера; при рестарте
 * незавершённые генерации теряются — для прототипа допустимо.
 */

const { db } = require("./db");
const { buildReport } = require("./report");

const timers = new Map(); // orderId -> [timeoutId...]

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

const ACTIVE = ["Оплачен", "Передан в обработку", "Сбор исходных данных", "Выполняется анализ", "Формируется PDF"];

const fmt = (d) =>
  d.toLocaleDateString("ru-RU") +
  " " +
  d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

function pushStatus(order, status) {
  const entry = { status, at: fmt(new Date()) };
  order.statusHistory.push(entry);
  order.status = status;
  return entry;
}

/* Уведомления: пользователь + администраторы (п. 12 ТЗ) */
function notify(userId, type, text) {
  const n = {
    id: "n" + Date.now() + "-" + Math.random().toString(16).slice(2, 6),
    userId,
    type,
    text,
    createdAt: fmt(new Date()),
    read: false,
  };
  db.notifications.push(n);
  return n;
}

function notifyAdmins(type, text) {
  db.users.filter((u) => u.role === "admin").forEach((a) => notify(a.id, type, text));
}

/* Мок отправки письма — в проде SMTP/сервис рассылки (п. 9.3, 14 ТЗ) */
function sendEmail(user, subject, text) {
  const email = {
    to: user.email,
    subject,
    text,
    sentAt: fmt(new Date()),
  };
  db.emails.push(email);
  console.log("[mail:mock] " + user.email + " — " + subject);
}

function clearTimers(orderId) {
  const list = timers.get(orderId) || [];
  list.forEach((t) => clearTimeout(t));
  timers.set(orderId, []);
}

/* Запуск/перезапуск генерации после успешной оплаты */
function startGeneration(order) {
  const user = db.users.find((u) => u.id === order.userId);
  clearTimers(order.id);

  const job = {
    id: "G-" + db.generationSeq++,
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
  if (user) notify(user.id, "order", "Заказ " + order.id + " передан в аналитический модуль.");
  if (user) sendEmail(user, "Гео Разум: заказ " + order.id + " принят", "Мы начали обработку заказа " + order.id + ".");

  const step = (delay, status) => {
    const t = setTimeout(() => {
      const current = db.orders.find((o) => o.id === order.id);
      if (!current || current.status === "Готово" || current.status === "Ошибка генерации") return;
      pushStatus(current, status);
      job.status = status;
    }, delay);
    (timers.get(order.id) || []).push(t);
    if (!timers.get(order.id)) timers.set(order.id, [t]);
  };

  const finish = setTimeout(() => {
    const current = db.orders.find((o) => o.id === order.id);
    if (!current || current.status === "Ошибка генерации") return;
    const report = buildReport(current);
    db.reports[report.id] = report;
    current.reportId = report.id;
    pushStatus(current, "Готово");
    job.status = "Готово";
    job.finishedAt = new Date();
    if (user) {
      notify(user.id, "order", "Отчёт по заказу " + order.id + " готов: доступен в разделе «Мои отчёты».");
      sendEmail(
        user,
        "Гео Разум: отчёт по участку " + current.parcel.cadastral + " готов",
        "Здравствуйте, " + user.firstName + "! Анализ завершён. Уровень " + current.level.toUpperCase() +
          ". Скачать отчёт: /order/" + current.id + "/report. Личный кабинет: /cabinet.",
      );
    }
    notifyAdmins("system", "Генерация по заказу " + order.id + " завершена успешно.");
  }, 4200);
  (timers.get(order.id) || []).push(finish);
  timers.set(order.id, timers.get(order.id) || [finish]);

  step(900, "Сбор исходных данных");
  step(1800, "Выполняется анализ");
  step(3000, "Формируется PDF");
  order._jobId = job.id;
  return job;
}

/* Повторная генерация (п. 8.4, 11.2 ТЗ) */
function retryGeneration(order) {
  order.statusHistory = order.statusHistory || [];
  order.reportId = null;
  startGeneration(order);
  return order;
}

module.exports = { STATUSES, ACTIVE, pushStatus, startGeneration, retryGeneration, notify, notifyAdmins, fmt };
