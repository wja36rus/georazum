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
let lastFocus = null;

/* Закрывает все открытые модалки и возвращает фокус туда, откуда они открыты. */
function closeModals() {
  $(".modal.is-open").removeClass("is-open");
  if (lastFocus) lastFocus.focus();
}

function initUI() {
  initNav();
  initReveal();
  initModals();
  initHero();
  initLeadForm();
  initWizard();
  initTopup();
  initAuth();
  initCabinet();
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
  const closeAll = closeModals;
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
    api("/api/leads", {
      method: "POST",
      body: { name, contact, company },
    }).then((r) => {
      /* Офлайн-фолбэк: сервер не запущен — считаем заявку отправленной. */
      $note
        .removeClass("is-error")
        .text(
          r.ok && r.data.message
            ? r.data.message
            : "Заявка отправлена. Менеджер по интеграциям свяжется с вами в рабочее время.",
        );
      $form[0].reset();
    });
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

  /* Авторизованный пользователь платит с баланса: поля уже известны,
     шаг оплаты в goTo пропускается. */
  const user = loadUser();
  if (user && user.name) {
    $root.find('[data-field="name"]').val(user.name);
    $root.find('[data-field="email"]').val(user.email);
    $root.find('[data-field="phone"]').val(user.phone || MOCK_USER_PHONE);
    $root.find('[data-step="4"] [data-next]').text("Оформить заказ →");
  } else {
    /* Неавторизованному на экране успеха кнопка ЛК не нужна. */
    $root.find("[data-success-cabinet]").hide();
  }

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
    let target = Math.min(6, Math.max(1, n));
    /* Оплата картой авторизованному не показывается: с шага 4 сразу успех.
       Проверка живая — вход прямо на странице заказа тоже переключает режим. */
    const skipP = !!(loadUser() && loadUser().name);
    if (skipP && target === 5) target = n > state.step ? 6 : 4;
    state.step = target;
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
      const logged = !!(loadUser() && loadUser().name);
      const final = logged && state.step === 4 ? 6 : state.step + 1;
      if (final !== 6) {
        goTo(state.step + 1);
        return;
      }
      /* Последний шаг: создаем заказ в API. При недоступности сервера
         (offline) показываем экран успеха, как в клиентской имитации. */
      const submit = $next[0];
      submit.disabled = true;
      api("/api/orders", {
        method: "POST",
        body: {
          name: $root.find('[data-field="name"]').val().trim(),
          email: state.email,
          phone: $root.find('[data-field="phone"]').val().trim(),
          roleId: state.role,
          moduleIds: state.modules,
          parcelId: "36:25:6945030:776",
          payment: logged ? "balance" : "card",
        },
      }).then((r) => {
        submit.disabled = false;
        if (r.ok || r.offline) {
          goTo(state.step + 1);
          return;
        }
        /* 402 — не хватает баланса, 400 — данные. Ошибка ниже поля с кнопкой. */
        $errorBox
          .text(
            r.data.error || "Не удалось оформить заказ. Попробуйте ещё раз.",
          )
          .trigger("focus");
      });
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

/* ЛК: пополнение баланса (клиентская имитация) */
function initTopup() {
  const $box = $("[data-topup]");
  if (!$box.length) return;
  const $balance = $("[data-balance]");
  const $history = $("[data-payments]");
  const $note = $box.find("[data-topup-note]");
  const $card = $box.find('[data-field="card"]');
  const $expiry = $box.find('[data-field="expiry"]');
  const $amount = $box.find("[data-amount]");
  let sum = 0;

  $box.on("click", (e) => {
    const $chip = $(e.target).closest("[data-sum]");
    if (!$chip.length) return;
    sum = +$chip[0].dataset.sum;
    $amount.val(sum.toLocaleString("ru-RU"));
    $box.find("[data-sum]").each(function () {
      $(this).toggleClass("is-active", this === $chip[0]);
    });
  });
  $box.on("input", "[data-amount]", function () {
    this.value = digits(this.value).slice(0, 7);
    $box.find("[data-sum]").removeClass("is-active");
    sum = +this.value || 0;
  });
  $box.on("submit", (e) => {
    e.preventDefault();
    if (sum < 100) {
      $note.addClass("is-error").text("Укажите сумму пополнения от 100 ₽.");
      return;
    }
    if (digits($card.val()).length !== 16 || !isExpiryValid($expiry.val())) {
      $note
        .addClass("is-error")
        .text("Проверьте карту: 16 цифр номера и срок действия ММ/ГГ.");
      return;
    }
    const done = (balance, payment, offline) => {
      if (!offline && payment) {
        if ($history.length)
          $history.prepend(
            "<tr><td>" +
              payment.date +
              "</td><td>" +
              payment.desc +
              "</td><td class='sum sum--plus'>+" +
              rub(payment.amount) +
              "</td><td><span class='tag tag--ok'>" +
              payment.status +
              "</span></td></tr>",
          );
      } else if ($history.length) {
        const date = new Date().toLocaleDateString("ru-RU");
        $history.prepend(
          "<tr><td>" +
            date +
            "</td><td>Пополнение баланса</td>" +
            "<td class='sum sum--plus'>+" +
            rub(sum) +
            "</td><td><span class='tag tag--ok'>Зачислен</span></td></tr>",
        );
      }
      if ($balance.length) {
        const next = offline
          ? parseInt($balance.data("balance"), 10) + sum
          : balance;
        $balance.data("balance", next).text(rub(next));
      }
      $note
        .removeClass("is-error")
        .text("Счёт пополнен: +" + rub(sum) + ". Средства уже на балансе.");
      $amount.val("");
      $card.val("");
      $expiry.val("");
      $box.find("[data-sum]").removeClass("is-active");
      sum = 0;
      closeModals();
    };
    const u = loadUser();
    if (u && u.token) {
      api("/api/payments/topup", {
        method: "POST",
        body: {
          amount: sum,
          card: digits($card.val()),
          expiry: digits($expiry.val()),
        },
      }).then((r) => {
        if (r.ok) done(r.data.balance, r.data.payment, false);
        else if (!r.offline && r.data.error)
          $note.addClass("is-error").text(r.data.error);
        else done(null, null, true);
      });
    } else {
      done(null, null, true);
    }
  });

  const mask = (sel, fn) => {
    $box.find(sel).on("input", function () {
      this.value = fn(this.value);
    });
  };
  mask('[data-field="card"]', formatCard);
  mask('[data-field="expiry"]', formatExpiry);
}

/* ---------- Авторизация: localStorage (клиентская имитация) ---------- */
const AUTH_KEY = "georazum.user";
/* Имя и фамилия, телефон — мок: это авторизация, а не регистрация. */
const MOCK_USER_NAME = "Иван Иванов";
const MOCK_USER_PHONE = "+7 (900) 123-45-67";

function loadUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
const saveUser = (user) => localStorage.setItem(AUTH_KEY, JSON.stringify(user));
const clearUser = () => localStorage.removeItem(AUTH_KEY);

/* ---------- API: Express-сервер (api/express). При недоступности сервера
   api() возвращает { ok:false, offline:true } — сайт живёт на локальных моках. ---------- */
const API_BASE = "http://127.0.0.1:3001";

function api(path, opts) {
  const method = (opts && opts.method) || "GET";
  const body = opts && opts.body;
  const headers = { "Content-Type": "application/json" };
  const u = loadUser();
  if (u && u.token) headers.Authorization = "Bearer " + u.token;
  return fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    })
    .catch(() => ({ ok: false, offline: true }));
}

function initAuth() {
  const $guest = $("[data-auth-guest]");
  const $user = $("[data-auth-user]");
  if (!$guest.length && !$user.length) return;

  const render = () => {
    const u = loadUser();
    const logged = !!(u && u.name);
    $guest[0] && $guest[0].toggleAttribute("hidden", logged);
    $user[0] && $user[0].toggleAttribute("hidden", !logged);
    if (!logged) return;
    $("[data-auth-name]").text(u.name);
    $("[data-profile-name]").text(u.name);
    $("[data-profile-email]").text(u.email);
    if (u.phone) $("[data-profile-phone]").text(u.phone);
  };
  render();

  /* Есть токен — обновляем профиль с сервера (best-effort, офлайн не мешает). */
  const u0 = loadUser();
  if (u0 && u0.token) {
    api("/api/me").then((r) => {
      if (r.ok && r.data.user) {
        const merged = Object.assign({}, loadUser(), r.data.user, {
          token: u0.token,
        });
        saveUser(merged);
        render();
      }
    });
  }

  /* Вход из модалки: сначала API, при офлайне — локальный мок. */
  $("[data-login-submit]").on("click", function () {
    const email = $("#login-email").val().trim();
    const $note = $("[data-login-note]");
    if (!isEmail(email)) {
      $note.addClass("is-error").text("Укажите корректный email.");
      return;
    }
    api("/api/login", { method: "POST", body: { email } }).then((r) => {
      if (r.ok && r.data.token)
        saveUser(Object.assign({ token: r.data.token }, r.data.user));
      else saveUser({ name: MOCK_USER_NAME, email, phone: MOCK_USER_PHONE });
      /* На странице заказа после входа остаёмся оформлять заказ, иначе — в ЛК. */
      if ($("[data-wizard]").length) {
        $note.text("Вы вошли. Оформляйте заказ без оплаты картой.");
        closeModals();
        render();
      } else {
        location.href = "cabinet.html";
      }
    });
  });

  /* Выход: чистим localStorage и предлагаем авторизоваться заново. */
  $("[data-logout]").on("click", function () {
    const done = () => {
      clearUser();
      if (location.pathname.indexOf("cabinet") !== -1)
        location.href = "index.html";
      else render();
    };
    const u = loadUser();
    if (u && u.token) api("/api/logout", { method: "POST" }).then(done);
    else done();
  });
}

/* ЛК: баланс и истории тянутся из API. Офлайн — статичная разметка остается. */
function initCabinet() {
  if (location.pathname.indexOf("cabinet") === -1) return;
  const u = loadUser();
  if (!u || !u.token) return;
  api("/api/balance").then((r) => {
    if (!r.ok) return;
    const $b = $("[data-balance]");
    if ($b.length) $b.data("balance", r.data.balance).text(rub(r.data.balance));
  });
  api("/api/orders").then((r) => {
    if (!r.ok) return;
    const $tb = $("tbody[data-orders]");
    if (!$tb.length) return;
    $tb.html(
      r.data.orders
        .map(
          (o) =>
            "<tr><td>" +
            o.date +
            "</td><td><b>" +
            o.parcel +
            '</b><br /><span class="muted">' +
            o.address +
            "</span></td><td>" +
            o.tariff +
            '</td><td><span class="tag tag--' +
            (o.status === "Готов"
              ? "ok"
              : o.status === "Возврат"
                ? "gray"
                : "warn") +
            '">' +
            o.status +
            "</span></td><td>" +
            (o.status === "Готов"
              ? '<a class="link-arrow" href="report-demo.html" target="_blank" rel="noopener">PDF</a>'
              : "—") +
            "</td></tr>",
        )
        .join(""),
    );
  });
  api("/api/payments").then((r) => {
    if (!r.ok) return;
    const $tb = $("[data-payments]");
    if (!$tb.length) return;
    $tb.html(
      r.data.payments
        .map(
          (p) =>
            "<tr><td>" +
            p.date +
            "</td><td>" +
            p.desc +
            '</td><td class="sum' +
            (p.amount > 0 ? " sum--plus" : "") +
            '">' +
            (p.amount > 0 ? "+" : "−") +
            " " +
            Math.abs(p.amount).toLocaleString("ru-RU") +
            " ₽</td><td><span class='tag tag--ok'>" +
            p.status +
            "</span></td></tr>",
        )
        .join(""),
    );
  });
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
