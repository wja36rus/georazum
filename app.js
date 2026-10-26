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

/* ---------- Интерфейс (jQuery) ---------- */
function initUI() {
  initNav();
  initReveal();
  initModals();
  initHero();
  initLeadForm();
  initWizard();
}

function initNav() {
  const $burger = $("[data-burger]");
  const $nav = $("[data-nav]");
  if (!$burger.length || !$nav.length) return;
  const close = () => {
    $nav.removeClass("is-open");
    $burger.attr("aria-expanded", "false");
  };
  $burger.on("click", () => {
    const open = $nav.toggleClass("is-open").hasClass("is-open");
    $burger.attr("aria-expanded", String(open));
  });
  $nav.on("click", (e) => {
    if (e.target.tagName === "A") close();
  });
}

/* Появление блоков при скролле (WOW.js из vendor/wow.min.js). */
function initReveal() {
  const reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || typeof WOW === "undefined") return;
  $("html").addClass("js-anim");
  new WOW({ offset: 60 }).init();
  // WOW.js не раскрывает блоки, оставшиеся выше позиции загрузки (заход по ссылке index.html#tariffs),
  // поэтому после полной загрузки показываем их без анимации.
  $(window).on("load", () => {
    $(".wow").each(function () {
      if (this.getBoundingClientRect().bottom < 0)
        this.style.visibility = "visible";
    });
  });
}

function initModals() {
  const $openers = $("[data-open-modal]");
  if (!$openers.length) return;
  let lastFocus = null;
  const closeAll = () => {
    $(".modal.is-open").removeClass("is-open");
    if (lastFocus) lastFocus.focus();
  };
  $openers.on("click", function () {
    const $modal = $("#modal-" + $(this).data("openModal"));
    if (!$modal.length) return;
    lastFocus = document.activeElement;
    $modal.addClass("is-open");
    const $focusable = $modal.find("button, [href], input").first();
    if ($focusable.length) $focusable.trigger("focus");
  });
  $(".modal").on("click", (e) => {
    if (
      e.target === e.currentTarget ||
      $(e.target).closest("[data-close-modal]").length
    )
      closeAll();
  });
  $(document).on("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });
}

/* Главная: поле ввода в hero ведет в конструктор */
function initHero() {
  const $form = $("[data-hero-form]");
  if (!$form.length) return;
  $form.on("submit", (e) => {
    e.preventDefault();
    location.href = "order.html";
  });
}

/* Главная: B2B/B2G заявка (клиентская имитация) */
function initLeadForm() {
  const $form = $("[data-lead-form]");
  if (!$form.length) return;
  const $note = $form.find("[data-note]");
  $form.on("submit", (e) => {
    e.preventDefault();
    const name = $form.find('[name="lead-name"]').val();
    const contact = $form.find('[name="lead-contact"]').val();
    const company = $form.find('[name="lead-company"]').val();
    if (
      !isName(name) ||
      (contact.indexOf("@") > 0 ? !isEmail(contact) : !isPhone(contact)) ||
      company.trim().length < 2
    ) {
      $note
        .text("Проверьте поля: имя, корректный контакт и название организации.")
        .addClass("is-error");
      return;
    }
    $note
      .removeClass("is-error")
      .text(
        "Заявка отправлена. Менеджер по интеграциям свяжется с вами в рабочее время.",
      );
    $form[0].reset();
  });
}

function initWizard() {
  const $root = $("[data-wizard]");
  if (!$root.length) return;

  const params = new URLSearchParams(location.search);
  const state = {
    step: 1,
    role: TARIFFS[params.get("role")] ? params.get("role") : "",
    modules: [],
    email: "",
  };

  const $steps = $root.find("[data-step]");
  const $progressText = $root.find("[data-progress-text]");
  const $progressBar = $root.find("[data-progress-bar]");
  const $totalOut = $root.find("[data-total]");
  const $errorBox = $root.find("[data-error]");

  const $rolesBox = $root.find("[data-roles]");
  if ($rolesBox.length) {
    $rolesBox.html(
      Object.entries(TARIFFS)
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
        .join(""),
    );
  }

  const $modBox = $root.find("[data-modules]");
  if ($modBox.length) {
    $modBox.html(
      Object.entries(MODULES)
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
        .join(""),
    );
  }

  const refresh = () => {
    $totalOut.text(rub(totalPrice(state.role, state.modules)));
    $root.find("[data-role]").each(function () {
      $(this).toggleClass("is-active", this.dataset.role === state.role);
    });
  };

  const goTo = (n, opts) => {
    const silent = !!(opts && opts.silent);
    state.step = Math.min(6, Math.max(1, n));
    $steps.each(function () {
      $(this).toggleClass("is-hidden", +this.dataset.step !== state.step);
    });
    $progressText.text("Шаг " + state.step + " из 6");
    $progressBar.css("width", (state.step / 6) * 100 + "%");
    if ($errorBox.length) $errorBox.text("");
    if (state.step === 6) {
      const $mail = $root.find("[data-success-email]");
      if ($mail.length) $mail.text(state.email);
    }
    if (silent) return;
    const $heading = $root.find('[data-step="' + state.step + '"] h2');
    if ($heading.length) $heading.trigger("focus");
    $root[0].scrollIntoView({ block: "start", behavior: "smooth" });
  };

  /* Проверки перед переходом. Пункт 4 и 5 — единственные шаги с реальным вводом. */
  const validators = {
    2: () => (state.role ? "" : "Выберите формат отчета, чтобы продолжить."),
    4: () => {
      const val = (sel) => $root.find(sel).val();
      const name = val('[data-field="name"]'),
        email = val('[data-field="email"]'),
        phone = val('[data-field="phone"]');
      if (!isName(name))
        return "Укажите имя и фамилию — они попадут на титульный лист отчета.";
      if (!isEmail(email))
        return "Проверьте email: на него придет ссылка на PDF.";
      if (!isPhone(phone))
        return "Проверьте телефон в формате +7 (900) 000-00-00.";
      if (!$root.find('[data-field="consent"]').prop("checked"))
        return "Подтвердите согласие с политикой обработки данных и офертой.";
      state.email = email.trim();
      return "";
    },
    5: () => {
      const val = (sel) => $root.find(sel).val();
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

  $root.on("click", (e) => {
    const $pick = $(e.target).closest("[data-role]");
    if ($pick.length) {
      state.role = $pick[0].dataset.role;
      refresh();
      return;
    }

    const $next = $(e.target).closest("[data-next]");
    if ($next.length) {
      const check = validators[state.step];
      const err = check ? check() : "";
      if (err) {
        $errorBox.text(err).trigger("focus");
        return;
      }
      goTo(state.step + 1);
      return;
    }
    if ($(e.target).closest("[data-prev]").length) goTo(state.step - 1);
  });

  $root.on("change", (e) => {
    const $box = $(e.target).closest("[data-module]");
    if (!$box.length) return;
    state.modules = $box.prop("checked")
      ? state.modules.concat($box[0].dataset.module)
      : state.modules.filter((id) => id !== $box[0].dataset.module);
    refresh();
  });

  const mask = (sel, fn) => {
    $root.find(sel).on("input", function () {
      this.value = fn(this.value);
    });
  };
  mask('[data-field="card"]', formatCard);
  mask('[data-field="expiry"]', formatExpiry);
  mask('[data-field="phone"]', formatPhone);
  mask('[data-field="cvv"]', digits);

  refresh();
  goTo(params.get("step") === "3" ? 3 : 1, { silent: true });
}

if (typeof document !== "undefined" && typeof jQuery !== "undefined") {
  jQuery(function () {
    initUI();
  });
}

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
