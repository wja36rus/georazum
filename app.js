"use strict";

/* ---------- Тарифы и модули: единый источник данных для обеих страниц ---------- */
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

const rub = (n) => n.toLocaleString("ru-RU") + " ₽";
const digits = (v) => String(v == null ? "" : v).replace(/\D/g, "");

function totalPrice(roleId, moduleIds) {
  const base = TARIFFS[roleId] ? TARIFFS[roleId].price : 0;
  return (moduleIds || []).reduce(
    (sum, id) => sum + (MODULES[id] ? MODULES[id].price : 0),
    base,
  );
}

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/.test(String(v || "").trim());
const isPhone = (v) => digits(v).length === 11;
const isName = (v) => String(v || "").trim().length >= 2;

/* Срок действия карты: ММ/ГГ не в прошлом */
function isExpiryValid(v, now) {
  const d = digits(v);
  if (d.length !== 4) return false;
  const month = +d.slice(0, 2);
  if (month < 1 || month > 12) return false;
  const date = now || new Date();
  const year = 2000 + +d.slice(2);
  return (
    year > date.getFullYear() ||
    (year === date.getFullYear() && month >= date.getMonth() + 1)
  );
}

function formatPhone(v) {
  let d = digits(v);
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (!d.startsWith("7")) d = "7" + d;
  d = d.slice(0, 11);
  let out = "+7";
  if (d.length > 1) out += " (" + d.slice(1, 4);
  if (d.length >= 5) out += ") " + d.slice(4, 7);
  if (d.length >= 8) out += "-" + d.slice(7, 9);
  if (d.length >= 10) out += "-" + d.slice(9, 11);
  return out;
}
const formatCard = (v) =>
  digits(v)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
const formatExpiry = (v) => {
  const d = digits(v).slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
};

/* ---------- Интерфейс ---------- */
function initUI() {
  initNav();
  initModals();
  initHero();
  initLeadForm();
  initWizard();
}

function initNav() {
  const burger = document.querySelector("[data-burger]");
  const nav = document.querySelector("[data-nav]");
  if (!burger || !nav) return;
  const close = () => {
    nav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
  };
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
  });
  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") close();
  });
}

function initModals() {
  const openers = document.querySelectorAll("[data-open-modal]");
  if (!openers.length) return;
  let lastFocus = null;
  const open = (id) => {
    const modal = document.getElementById("modal-" + id);
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    const focusable = modal.querySelector("button, [href], input");
    if (focusable) focusable.focus();
  };
  const closeAll = () => {
    document
      .querySelectorAll(".modal.is-open")
      .forEach((m) => m.classList.remove("is-open"));
    if (lastFocus) lastFocus.focus();
  };
  openers.forEach((b) =>
    b.addEventListener("click", () => open(b.dataset.openModal)),
  );
  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m || e.target.closest("[data-close-modal]")) closeAll();
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
}

/* Главная: поле ввода в hero ведет в конструктор */
function initHero() {
  const form = document.querySelector("[data-hero-form]");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    location.href = "order.html";
  });
}

/* Главная: B2B/B2G заявка (клиентская имитация) */
function initLeadForm() {
  const form = document.querySelector("[data-lead-form]");
  if (!form) return;
  const note = form.querySelector("[data-note]");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.querySelector('[name="lead-name"]').value;
    const contact = form.querySelector('[name="lead-contact"]').value;
    const company = form.querySelector('[name="lead-company"]').value;
    if (
      !isName(name) ||
      (contact.indexOf("@") > 0 ? !isEmail(contact) : !isPhone(contact)) ||
      company.trim().length < 2
    ) {
      note.textContent =
        "Проверьте поля: имя, корректный контакт и название организации.";
      note.classList.add("is-error");
      return;
    }
    note.classList.remove("is-error");
    note.textContent =
      "Заявка отправлена. Менеджер по интеграциям свяжется с вами в рабочее время.";
    form.reset();
  });
}

function initWizard() {
  const root = document.querySelector("[data-wizard]");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const state = {
    step: 1,
    role: TARIFFS[params.get("role")] ? params.get("role") : "",
    modules: [],
    email: "",
  };

  const steps = [...root.querySelectorAll("[data-step]")];
  const progressText = root.querySelector("[data-progress-text]");
  const progressBar = root.querySelector("[data-progress-bar]");
  const totalOut = root.querySelectorAll("[data-total]");
  const errorBox = root.querySelector("[data-error]");

  const rolesBox = root.querySelector("[data-roles]");
  if (rolesBox) {
    rolesBox.innerHTML = Object.entries(TARIFFS)
      .map(
        ([id, t]) =>
          '<button type="button" class="pick" data-role="' +
          id +
          '">' +
          '<span class="pick__icon">' +
          t.icon +
          "</span>" +
          '<span class="pick__text"><b>' +
          t.name +
          '</b><span class="pick__price">' +
          rub(t.price) +
          "</span></span></button>",
      )
      .join("");
  }

  const modBox = root.querySelector("[data-modules]");
  if (modBox) {
    modBox.innerHTML = Object.entries(MODULES)
      .map(
        ([id, m]) =>
          '<label class="module">' +
          '<input type="checkbox" data-module="' +
          id +
          '">' +
          "<span><b>Модуль «" +
          m.name +
          "» (+ " +
          m.price +
          ' ₽)</b><span class="muted">' +
          m.note +
          "</span></span></label>",
      )
      .join("");
  }

  const refresh = () => {
    totalOut.forEach((el) => {
      el.textContent = rub(totalPrice(state.role, state.modules));
    });
    root
      .querySelectorAll("[data-role]")
      .forEach((b) =>
        b.classList.toggle("is-active", b.dataset.role === state.role),
      );
  };

  const goTo = (n, opts) => {
    const silent = !!(opts && opts.silent);
    state.step = Math.min(6, Math.max(1, n));
    steps.forEach((s) =>
      s.classList.toggle("is-hidden", +s.dataset.step !== state.step),
    );
    progressText.textContent = "Шаг " + state.step + " из 6";
    progressBar.style.width = (state.step / 6) * 100 + "%";
    if (errorBox) {
      errorBox.textContent = "";
    }
    if (state.step === 6) {
      const mail = root.querySelector("[data-success-email]");
      if (mail) mail.textContent = state.email;
    }
    const heading = root.querySelector('[data-step="' + state.step + '"] h2');
    if (silent) return;
    if (heading) heading.focus();
    root.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  /* Проверки перед переходом. Пункт 4 и 5 — единственные шаги с реальным вводом. */
  const validators = {
    2: () => (state.role ? "" : "Выберите формат отчета, чтобы продолжить."),
    4: () => {
      const val = (sel) => root.querySelector(sel).value;
      const name = val('[data-field="name"]'),
        email = val('[data-field="email"]'),
        phone = val('[data-field="phone"]');
      if (!isName(name))
        return "Укажите имя и фамилию — они попадут на титульный лист отчета.";
      if (!isEmail(email))
        return "Проверьте email: на него придет ссылка на PDF.";
      if (!isPhone(phone))
        return "Проверьте телефон в формате +7 (900) 000-00-00.";
      if (!root.querySelector('[data-field="consent"]').checked)
        return "Подтвердите согласие с политикой обработки данных и офертой.";
      state.email = email.trim();
      return "";
    },
    5: () => {
      const val = (sel) => root.querySelector(sel).value;
      if (digits(val('[data-field="card"]')).length !== 16)
        return "Введите 16 цифр номера карты.";
      if (!isExpiryValid(val('[data-field="expiry"]')))
        return "Проверьте срок действия: формат ММ/ГГ, месяц от 01 до 12 и не в прошлом.";
      if (digits(val('[data-field="cvv"]')).length !== 3)
        return "CVV состоит из 3 цифр.";
      if (val('[data-field="holder"]').trim().length < 3)
        return "Укажите имя владельца карты.";
      return "";
    },
  };

  root.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-role]");
    if (pick) {
      state.role = pick.dataset.role;
      refresh();
      return;
    }

    const next = e.target.closest("[data-next]");
    if (next) {
      const check = validators[state.step];
      const err = check ? check() : "";
      if (err) {
        errorBox.textContent = err;
        errorBox.focus();
        return;
      }
      goTo(state.step + 1);
      return;
    }
    if (e.target.closest("[data-prev]")) goTo(state.step - 1);
  });

  root.addEventListener("change", (e) => {
    const box = e.target.closest("[data-module]");
    if (!box) return;
    state.modules = box.checked
      ? state.modules.concat(box.dataset.module)
      : state.modules.filter((id) => id !== box.dataset.module);
    refresh();
  });

  const mask = (sel, fn) => {
    const el = root.querySelector(sel);
    if (el)
      el.addEventListener("input", () => {
        el.value = fn(el.value);
      });
  };
  mask('[data-field="card"]', formatCard);
  mask('[data-field="expiry"]', formatExpiry);
  mask('[data-field="phone"]', formatPhone);
  mask('[data-field="cvv"]', digits);

  refresh();
  goTo(params.get("step") === "3" ? 3 : 1, { silent: true });
}

if (typeof document !== "undefined") initUI();
if (typeof module !== "undefined") {
  module.exports = {
    TARIFFS,
    MODULES,
    totalPrice,
    isEmail,
    isPhone,
    isName,
    isExpiryValid,
    formatPhone,
    formatCard,
    formatExpiry,
  };
}
