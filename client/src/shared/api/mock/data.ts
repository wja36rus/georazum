/*
 * Мок-хранилище для статического демо (без бэкенда).
 * Зеркало server/src/db.js — все данные живут в памяти сессии браузера
 * и сбрасываются при перезагрузке страницы.
 */

/* ---------- Уровни аналитики S/M/L (тарифы) ---------- */

export type MockLevel = {
  id: "s" | "m" | "l";
  name: string;
  tagline: string;
  price: number;
  duration: string;
  audience: string;
  includes: string[];
  results: string[];
  investorFields?: {
    key: string;
    label: string;
    placeholder: string;
  }[];
  available?: boolean;
};

export const LEVELS: Record<MockLevel["id"], MockLevel> = {
  s: {
    id: "s",
    name: "S — Малый анализ",
    tagline: "Анализ участка под индивидуальный дом",
    price: 4900,
    duration: "до 24 часов",
    audience: "Физические лица, планирующие строительство ИЖД",
    includes: [
      "Проверка возможности строительства",
      "Градостроительные параметры: отступы, габариты дома",
      "Ограничения и обременения",
      "Подъезд и транспортная доступность",
      "Доступность инженерных сетей",
      "Дорожная карта до начала строительства",
    ],
    results: [
      "Правовой статус",
      "Градостроительные параметры",
      "Ограничения и обременения",
      "Транспортная доступность",
      "Инженерные сети",
      "Рекомендации и дорожная карта",
    ],
  },
  m: {
    id: "m",
    name: "M — Средний анализ",
    tagline: "Анализ территории под несколько домов",
    price: 14900,
    duration: "до 3 дней",
    audience: "Застройщики малоэтажных комплексов, коттеджных посёлков",
    includes: [
      "Весь функционал уровня S",
      "Групповая планировочная проработка",
      "Размещение нескольких объектов",
      "Внутренние проезды",
      "Инженерная инфраструктура территории",
      "Анализ смежных земельных участков",
      "Возможность расширения территории",
    ],
    results: [
      "Всё из S",
      "Схема групповой застройки",
      "Размещение объектов и проездов",
      "Инженерия территории",
      "Анализ смежных участков",
    ],
  },
  l: {
    id: "l",
    name: "L — Глубинный анализ",
    tagline: "Инвестиционный анализ участка",
    price: 49900,
    duration: "до 7 дней",
    audience: "Инвесторы, девелоперы",
    includes: [
      "Весь функционал уровня M",
      "Анализ инвестиционного потенциала",
      "Анализ рынка и целевой аудитории",
      "Альтернативные сценарии освоения",
      "Верхнеуровневая финансовая модель",
      "Оценка рисков",
      "Предварительное инвестиционное заключение",
    ],
    results: [
      "Всё из M",
      "Инвестиционный потенциал",
      "Сценарии освоения",
      "Финансовая модель (CAPEX, NPV, IRR, окупаемость)",
      "Оценка рисков",
      "Инвестиционное заключение",
    ],
    investorFields: [
      {
        key: "direction",
        label: "Направление инвестиционного проекта",
        placeholder: "Например: глэмпинг, КП, агротуризм",
      },
      {
        key: "budget",
        label: "Предполагаемый бюджет",
        placeholder: "Например: 50–120 млн ₽",
      },
      {
        key: "timeline",
        label: "Желаемые сроки реализации",
        placeholder: "Например: старт через 12 мес.",
      },
      {
        key: "payback",
        label: "Целевой срок окупаемости",
        placeholder: "Например: 7 лет",
      },
      {
        key: "yield",
        label: "Целевая доходность",
        placeholder: "Например: 18% годовых",
      },
      {
        key: "objects",
        label: "Предполагаемый состав объектов",
        placeholder: "Например: 12 домиков + ресторан",
      },
      {
        key: "requirements",
        label: "Дополнительные требования инвестора",
        placeholder: "Текст",
      },
    ],
  },
};

/* ---------- Мок-кадастровые объекты ---------- */

export type MockParcel = {
  cadastral: string;
  address: string;
  /** Человекочитаемая площадь, например «2 450 м² (24,5 сот.)». */
  area: string;
  /** Площадь в квадратных метрах (для расчёта суммарной площади). */
  areaSqm: number;
  cadastralValue: string;
  category: string;
  vri: string;
  restrictions: string[];
};

/**
 * Смежность участков (мок): кадастровый номер → список соседних номеров.
 * Нужно для проверки взаимного расположения (п. 2.4 User Journey).
 */
export const ADJACENT: Record<string, string[]> = {
  "36:16:3405742:189": ["36:16:3405742:190", "36:16:3405742:191"],
  "36:16:3405742:190": ["36:16:3405742:189", "36:16:3405742:191"],
  "36:16:3405742:191": ["36:16:3405742:189", "36:16:3405742:190"],
};

/**
 * Расстояние между несмежными участками (мок), метры.
 * Для пар, которых нет в карте, используется детерминированная оценка.
 */
export const DISTANCE_M: Record<string, Record<string, number>> = {
  "36:16:3405742:189": {
    "36:25:6945030:776": 12400,
    "36:34:1823050:441": 4800,
  },
  "36:25:6945030:776": {
    "36:16:3405742:189": 12400,
    "36:34:1823050:441": 21400,
  },
  "36:34:1823050:441": {
    "36:16:3405742:189": 4800,
    "36:25:6945030:776": 21400,
  },
};

/** Детерминированная оценка расстояния между двумя не-смежными участками. */
export function distanceBetween(a: string, b: string): number {
  const direct = DISTANCE_M[a]?.[b];
  if (direct) return direct;
  let h = 0;
  for (let i = 0; i < a.length + b.length; i++) {
    h = (h * 31 + (a + b).charCodeAt(i)) >>> 0;
  }
  return 900 + (h % 4100);
}

export const PARCELS: Record<string, MockParcel> = {
  "36:25:6945030:776": {
    cadastral: "36:25:6945030:776",
    address: "Воронежская обл., Рамонский р-н, урочище «Подгоренская дача»",
    area: "11 203 м² (1,1 га)",
    areaSqm: 11203,
    cadastralValue: "6 412 485 ₽",
    category: "Земли лесного фонда",
    vri: "Осуществление рекреационной деятельности",
    restrictions: ["Приаэродромная территория", "Зона охраняемого объекта"],
  },
  "36:16:3405742:189": {
    cadastral: "36:16:3405742:189",
    address: "Воронежская обл., Новоусманский р-н, с. Новая Усмань",
    area: "2 450 м² (24,5 сот.)",
    areaSqm: 2450,
    cadastralValue: "1 240 000 ₽",
    category: "Земли населённых пунктов",
    vri: "Для индивидуального жилищного строительства",
    restrictions: [],
  },
  "36:34:1823050:441": {
    cadastral: "36:34:1823050:441",
    address: "Воронежская обл., Острогожский р-н, г. Острогожск",
    area: "8 120 м² (0,8 га)",
    areaSqm: 8120,
    cadastralValue: "3 480 000 ₽",
    category: "Земли населённых пунктов",
    vri: "Малоэтажная многоквартирная жилая застройка",
    restrictions: ["Зона с особыми условиями использования"],
  },
  "36:16:3405742:190": {
    cadastral: "36:16:3405742:190",
    address:
      "Воронежская обл., Новоусманский р-н, с. Новая Усмань, северная часть",
    area: "3 150 м² (31,5 сот.)",
    areaSqm: 3150,
    cadastralValue: "1 590 000 ₽",
    category: "Земли населённых пунктов",
    vri: "Для индивидуального жилищного строительства",
    restrictions: [],
  },
  "36:16:3405742:191": {
    cadastral: "36:16:3405742:191",
    address:
      "Воронежская обл., Новоусманский р-н, с. Новая Усмань, восточная часть",
    area: "2 880 м² (28,8 сот.)",
    areaSqm: 2880,
    cadastralValue: "1 450 000 ₽",
    category: "Земли населённых пунктов",
    vri: "Для индивидуального жилищного строительства",
    restrictions: [],
  },
};

/* ---------- Оферта и документы ---------- */

export const OFFER = {
  version: "1.0",
  updatedAt: "01.10.2026",
  title:
    "Публичная оферта на оказание услуг по аналитическому заключению земельного участка",
  text: [
    "1. Общие положения. Настоящий документ является публичной офертой (ст. 437 ГК РФ) Исполнителя — ООО «Гео Разум» — о заключении договора возмездного оказания информационно-аналитических услуг.",
    "2. Предмет. Исполнитель обязуется по заданию Заказчика сформировать аналитическое заключение по земельному участку на основе открытых источников данных. Отчёт носит информационно-аналитический характер и не является юридическим заключением или кадастровой выпиской.",
    "3. Акцепт. Принятие условий оферты (акцепт) осуществляется путём подтверждения согласия в форме заказа и фиксируется системой: версия оферты, дата и время акцепта, пользователь и номер заказа.",
    "4. Оплата. Услуга оплачивается предварительно в порядке, предусмотренном разделом 7 ТЗ. Оплата производится онлайн через платёжного провайдера.",
    "5. Сроки. Ориентировочный срок формирования заключения указан на сайте и зависит от выбранного уровня анализа (S/M/L).",
    "6. Возврат средств. При невозможности оказания услуги по вине Исполнителя Заказчик вправе требовать возврата уплаченных средств. Порядок и сроки возврата устанавливаются настоящей офертой.",
    "7. Персональные данные. Обработка персональных данных осуществляется в соответствии с политикой конфиденциальности, размещённой на сайте.",
    "8. Юридическая формулировка настоящего документа финализируется заказчиком с профильным юристом до запуска в промышленную эксплуатацию.",
  ],
};

export const DOCUMENTS: {
  id: "offer" | "privacy" | "refunds";
  title: string;
  updatedAt: string;
}[] = [
  { id: "offer", title: "Договор публичной оферты", updatedAt: "01.10.2026" },
  {
    id: "privacy",
    title: "Политика обработки персональных данных",
    updatedAt: "01.10.2026",
  },
  {
    id: "refunds",
    title: "Политика возврата средств",
    updatedAt: "01.10.2026",
  },
];

export const DOC_TEXTS: Record<string, string[]> = {
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

/* ---------- Типы состояния ---------- */

export type MockUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Демо-мок: пароль в открытом виде (в проде — scrypt на сервере). */
  password: string;
  role: "user" | "admin";
  blocked: boolean;
  confirmed: boolean;
  createdAt: string;
  deleteRequestedAt: string | null;
};

export type MockCustomer = {
  /** Физлицо / ИП / юрлицо (шаг 4 User Journey). */
  type: "person" | "ip" | "company";
  // Общие
  email: string;
  phone?: string;
  // Физлицо и ИП
  firstName?: string;
  lastName?: string;
  middleName?: string;
  // ИП
  inn?: string;
  ogrnip?: string;
  // Юрлицо
  companyName?: string;
  innCompany?: string;
  kpp?: string;
  ogrn?: string;
  legalAddress?: string;
  representative?: string;
  position?: string;
};

export type MockOrder = {
  id: string;
  userId: string;
  /** Участки заказа (1+ по п. 2.1 User Journey). */
  parcels: MockParcel[];
  /** Первый участок — для обратной совместимости с одиночными заказами. */
  parcel: MockParcel;
  level: MockLevel["id"];
  price: number;
  status: string;
  statusHistory: { status: string; at: string }[];
  params: Record<string, string>;
  /** Данные заказчика (шаги 4–5 User Journey). */
  customer: MockCustomer | null;
  offer: { version: string; acceptedAt: string };
  createdAt: string;
  paidAt: string | null;
  reportId: string | null;
  transactionId: string | null;
  generationAttempts: number;
};

export type MockPayment = {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  transactionId: string;
};

export type MockNotification = {
  id: string;
  userId: string;
  type: "order" | "payment" | "account" | "email" | "lead" | "system" | "user";
  text: string;
  createdAt: string;
  read: boolean;
};

export type MockReport = {
  id: string;
  orderId: string;
  cadastral: string;
  level: string;
  title: string;
  generatedAt: string;
  summary: { address: string; area: string; level: string; price: number };
  sections: { title: string; body: string[] }[];
};

export type MockGenJob = {
  id: string;
  orderId: string;
  level: string;
  attempts: number;
  startedAt: Date;
  finishedAt: Date | null;
  status: string;
  error: string | null;
};

/* ---------- Форматирование ---------- */

export const fmt = (d = new Date()): string =>
  d.toLocaleDateString("ru-RU") +
  " " +
  d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

const CADASTRAL_RE = /^\d{2}:\d{2}:\d{7}:\d{3}$/;

export const isCadastral = (v: string): boolean => CADASTRAL_RE.test(v);

/* ---------- Состояние (in-memory) ---------- */

let userSeq = 1;
let orderSeq = 1001;
let paymentSeq = 1001;
let genSeq = 1;

const mkUser = (
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  password: string,
  role: "user" | "admin" = "user",
): MockUser => ({
  id: "u" + userSeq++,
  firstName,
  lastName,
  email,
  phone,
  password,
  role,
  blocked: false,
  confirmed: true,
  createdAt: fmt(),
  deleteRequestedAt: null,
});

const users: MockUser[] = [];

const tokens = new Map<string, string>(); // token -> userId

const orders: MockOrder[] = [];
const payments: MockPayment[] = [];
const notifications: MockNotification[] = [];
const reports: Record<string, MockReport> = {};
const generationQueue: MockGenJob[] = [];

/* Демо-данные, чтобы ЛК и админка выглядели живыми. */
function seed() {
  const ivan = mkUser(
    "Иван",
    "Иванов",
    "ivan@mail.ru",
    "+7 (900) 123-45-67",
    "demo1234",
  );
  const admin = mkUser(
    "Админ",
    "ГеоРазум",
    "admin@georazum.ru",
    "+7 (900) 000-00-00",
    "admin123",
    "admin",
  );
  users.push(ivan, admin);

  const o1: MockOrder = {
    id: "GR-" + orderSeq++,
    userId: ivan.id,
    parcels: [PARCELS["36:25:6945030:776"]],
    parcel: PARCELS["36:25:6945030:776"],
    level: "l",
    price: LEVELS.l.price,
    status: "Готово",
    statusHistory: [
      { status: "Заказ создан", at: "27.10.2026 11:02" },
      { status: "Ожидает оплаты", at: "27.10.2026 11:02" },
      { status: "Оплачен", at: "27.10.2026 11:05" },
      { status: "Передан в обработку", at: "27.10.2026 11:05" },
      { status: "Сбор исходных данных", at: "27.10.2026 11:06" },
      { status: "Выполняется анализ", at: "27.10.2026 11:20" },
      { status: "Формируется PDF", at: "27.10.2026 11:42" },
      { status: "Готово", at: "27.10.2026 11:45" },
    ],
    params: {
      direction: "Лесной ретрит «Тихая поляна»",
      budget: "90–120 млн ₽",
      timeline: "Старт через 12 мес.",
      payback: "96 месяцев",
      yield: "18% годовых",
      objects: "Глэмпинг на 89 мест + ресторан",
      requirements: "",
    },
    offer: { version: "1.0", acceptedAt: "27.10.2026 11:04" },
    createdAt: "27.10.2026 11:02",
    paidAt: "27.10.2026 11:05",
    reportId: "R-1",
    transactionId: "txn-1001",
    generationAttempts: 1,
    customer: {
      type: "person",
      firstName: "Иван",
      lastName: "Иванов",
      email: "ivan@mail.ru",
      phone: "+7 (900) 123-45-67",
    },
  };
  const o2: MockOrder = {
    id: "GR-" + orderSeq++,
    userId: ivan.id,
    parcels: [PARCELS["36:16:3405742:189"]],
    parcel: PARCELS["36:16:3405742:189"],
    level: "s",
    price: LEVELS.s.price,
    status: "Выполняется анализ",
    statusHistory: [
      { status: "Заказ создан", at: "28.10.2026 09:10" },
      { status: "Оплачен", at: "28.10.2026 09:12" },
      { status: "Передан в обработку", at: "28.10.2026 09:12" },
      { status: "Сбор исходных данных", at: "28.10.2026 09:15" },
      { status: "Выполняется анализ", at: "28.10.2026 09:40" },
    ],
    params: {},
    offer: { version: "1.0", acceptedAt: "28.10.2026 09:11" },
    createdAt: "28.10.2026 09:10",
    paidAt: "28.10.2026 09:12",
    reportId: null,
    transactionId: "txn-1002",
    generationAttempts: 1,
    customer: {
      type: "person",
      firstName: "Иван",
      lastName: "Иванов",
      email: "ivan@mail.ru",
      phone: "+7 (900) 123-45-67",
    },
  };
  orders.push(o1, o2);

  payments.push(
    {
      id: "P-1001",
      orderId: o1.id,
      userId: ivan.id,
      amount: o1.price,
      method: "card",
      status: "Оплачен",
      createdAt: o1.paidAt ?? "",
      transactionId: o1.transactionId ?? "",
    },
    {
      id: "P-1002",
      orderId: o2.id,
      userId: ivan.id,
      amount: o2.price,
      method: "card",
      status: "Оплачен",
      createdAt: o2.paidAt ?? "",
      transactionId: o2.transactionId ?? "",
    },
  );

  notifications.push(
    {
      id: "n1",
      userId: ivan.id,
      type: "order",
      text: `Заказ ${o1.id} готов: отчёт доступен в разделе «Мои отчёты».`,
      createdAt: "27.10.2026 11:45",
      read: false,
    },
    {
      id: "n2",
      userId: ivan.id,
      type: "order",
      text: `Заказ ${o2.id}: анализ выполняется, ожидайте результат.`,
      createdAt: "28.10.2026 09:40",
      read: false,
    },
  );
}

seed();

export const db = {
  users,
  tokens,
  levels: LEVELS,
  parcels: PARCELS,
  offer: OFFER,
  documents: DOCUMENTS,
  orders,
  payments,
  notifications,
  reports,
  generationQueue,
};

export const counters = {
  nextUser: () => "u" + userSeq++,
  nextOrder: () => "GR-" + orderSeq++,
  nextPayment: () => "P-" + paymentSeq++,
  nextGen: () => "G-" + genSeq++,
};
