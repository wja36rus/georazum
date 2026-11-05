/*
 * Анкеты дополнительных параметров для уровней M и L (п. 4 User Journey).
 *
 * M — 6 блоков (цель, количество домов, территория, соседи, инженерия,
 *      дополнительные требования);
 * L — 7 блоков (направление, цель, бюджет, сроки, доходность, параметры
 *      проекта с динамическим набором вопросов, предпочтения инвестора).
 *
 * Во всех блоках присутствует вариант «Не знаю / определите самостоятельно»:
 * система использует обоснованные расчётные допущения и отмечает их в отчёте.
 */

export type Option = { value: string; label: string };

/** Блок анкеты: заголовок, пояснение и поля. */
export type QuestionBlock = {
  id: string;
  title: string;
  hint?: string;
  fields: QuestionField[];
};

export type QuestionField =
  | {
      kind: "select";
      key: string;
      label: string;
      options: Option[];
      /** Пояснение под подписью поля. */
      hint?: string;
      /** Показывать поле-пояснение «Другое», если выбран этот вариант. */
      otherValue?: string;
      /** Убрать вариант «Не знаю / определите самостоятельно». */
      noDunno?: boolean;
    }
  | {
      kind: "radios";
      key: string;
      label: string;
      options: Option[];
      /** Пояснение под подписью поля. */
      hint?: string;
      otherValue?: string;
      noDunno?: boolean;
    }
  | {
      kind: "checkboxes";
      key: string;
      label: string;
      options: Option[];
    }
  | {
      kind: "text";
      key: string;
      label: string;
      placeholder?: string;
      /** Поле свободного ввода не обязательное. */
      optional?: boolean;
    }
  | {
      kind: "textarea";
      key: string;
      label: string;
      placeholder?: string;
      optional?: boolean;
    }
  | {
      kind: "radio-other";
      key: string;
      otherKey: string;
      label: string;
      /** Значение выбора, при котором активно поле otherKey. */
      otherValue?: string;
      options: Option[];
      /** Убрать вариант «Не знаю / определите самостоятельно». */
      noDunno?: boolean;
    };

const DUNNO = "не_знаю";

/** Радио с вариантом «Не знаю / определите самостоятельно» по умолчанию. */
function withDunno(options: Option[]): Option[] {
  return [
    ...options,
    { value: DUNNO, label: "Не знаю / определите самостоятельно" },
  ];
}

/* ================= Анкета M (п. 4.1) ================= */

export const M_BLOCKS: QuestionBlock[] = [
  {
    id: "m1",
    title: "M1. Назначение проекта",
    hint: "Для чего вы планируете использовать земельный участок?",
    fields: [
      {
        kind: "radio-other",
        key: "m_purpose",
        otherKey: "m_purpose_other",
        label: "Назначение проекта",
        otherValue: "other",
        options: [
          {
            value: "homes",
            label: "Строительство нескольких индивидуальных жилых домов",
          },
          { value: "lowrise", label: "Малоэтажный жилой комплекс" },
          { value: "townhouses", label: "Таунхаусы" },
          { value: "blocked", label: "Блокированная жилая застройка" },
          { value: "sale", label: "Дома для последующей продажи" },
          { value: "rent", label: "Дома для сдачи в аренду" },
          { value: "mixed", label: "Смешанный вариант" },
          { value: "other", label: "Другое" },
        ],
      },
    ],
  },
  {
    id: "m2",
    title: "M2. Планируемое количество домов",
    hint: "Сколько объектов вы планируете разместить?",
    fields: [
      {
        kind: "select",
        key: "m_house_count",
        label: "Количество домов",
        options: withDunno([
          { value: "2-3", label: "2–3" },
          { value: "4-5", label: "4–5" },
          { value: "6-10", label: "6–10" },
          { value: "11-20", label: "11–20" },
          { value: "20+", label: "Более 20" },
        ]),
      },
      {
        kind: "select",
        key: "m_floors",
        label: "Предполагаемая этажность",
        options: withDunno([
          { value: "1", label: "1 этаж" },
          { value: "2", label: "2 этажа" },
          { value: "3", label: "3 этажа" },
          { value: "up-to-3", label: "До 3 этажей" },
        ]),
      },
      {
        kind: "text",
        key: "m_house_area",
        label: "Желаемая площадь одного дома, м²",
        placeholder: "Например: 120",
        optional: true,
      },
      {
        kind: "text",
        key: "m_plot_area",
        label: "Желаемая площадь участка при каждом доме, сот.",
        placeholder: "Например: 8",
        optional: true,
      },
      {
        kind: "radios",
        key: "m_parking",
        label: "Наличие отдельных парковочных мест",
        options: withDunno([
          { value: "yes", label: "Да, для каждого дома" },
          { value: "common", label: "Общая парковка" },
          { value: "no", label: "Нет" },
        ]),
      },
      {
        kind: "radios",
        key: "m_entrances",
        label: "Необходимость отдельных въездов",
        options: withDunno([
          { value: "yes", label: "Да, отдельный въезд к каждому дому" },
          { value: "one", label: "Достаточно одного общего въезда" },
          { value: "no", label: "Нет" },
        ]),
      },
    ],
  },
  {
    id: "m3",
    title: "M3. Требования к территории",
    hint: "Отметьте всё, что применимо к вашей территории:",
    fields: [
      {
        kind: "checkboxes",
        key: "m_territory",
        label: "Требования к территории",
        options: [
          {
            value: "division",
            label: "Деление исходного участка на отдельные участки",
          },
          { value: "roads", label: "Создание внутренних проездов" },
          { value: "entrances", label: "Общий въезд или отдельные въезды" },
          { value: "recreation", label: "Общие зоны отдыха" },
          { value: "commercial", label: "Размещение коммерческих объектов" },
          {
            value: "kids",
            label: "Детские площадки или общественная инфраструктура",
          },
        ],
      },
    ],
  },
  {
    id: "m4",
    title: "M4. Соседние земельные участки",
    hint: "Рассматривать ли возможность расширения проекта за счёт соседних участков?",
    fields: [
      {
        kind: "radio-other",
        key: "m_neighbors",
        otherKey: "m_neighbors_distance",
        label: "Вариант расширения",
        options: [
          {
            value: "all",
            label: "Да, все потенциально доступные соседние участки",
          },
          {
            value: "adjacent",
            label: "Да, только непосредственно примыкающие участки",
          },
          { value: "area", label: "Да, только участки определённой площади" },
          {
            value: "no",
            label: "Нет, анализировать только выбранную территорию",
          },
        ],
      },
      {
        kind: "text",
        key: "m_neighbors_distance",
        label: "Максимальное расстояние от исходного участка, км",
        placeholder: "Например: 3",
        optional: true,
      },
      {
        kind: "text",
        key: "m_neighbors_min_area",
        label: "Минимальная площадь соседнего участка, сот.",
        placeholder: "Например: 10",
        optional: true,
      },
      {
        kind: "text",
        key: "m_neighbors_known",
        label: "Известные кадастровые номера соседних участков",
        placeholder: "Через запятую",
        optional: true,
      },
    ],
  },
  {
    id: "m5",
    title: "M5. Инженерные потребности",
    hint: "Какие коммуникации обязательны? Если мощность не известна — не заполняйте, мы не требуем самостоятельного расчёта.",
    fields: [
      {
        kind: "checkboxes",
        key: "m_engineering",
        label: "Требуемые инженерные сети",
        options: [
          { value: "water", label: "Центральное водоснабжение" },
          {
            value: "sewer",
            label: "Канализация или локальные очистные сооружения",
          },
          { value: "gas", label: "Газификация" },
          { value: "power", label: "Электрическая мощность" },
          { value: "heating", label: "Отопление" },
          { value: "storm", label: "Ливневая канализация" },
          { value: "internet", label: "Связь и интернет" },
        ],
      },
      {
        kind: "text",
        key: "m_engineering_power",
        label: "Требуемая электрическая мощность, кВт",
        placeholder: "Например: 15",
        optional: true,
      },
      {
        kind: "radios",
        key: "m_engineering_tu",
        label: "Есть ли известные технические условия?",
        options: withDunno([
          { value: "yes", label: "Да, есть документы" },
          { value: "no", label: "Нет" },
        ]),
      },
    ],
  },
  {
    id: "m6",
    title: "M6. Дополнительные пожелания",
    fields: [
      {
        kind: "textarea",
        key: "m_requirements",
        label:
          "Опишите дополнительные требования к проекту, которые необходимо учесть при анализе",
        placeholder:
          "Например: сохранить существующие деревья; предусмотреть отдельный въезд; не размещать дома вдоль шумной дороги…",
        optional: true,
      },
    ],
  },
];

/* ================= Анкета L (п. 4.3) ================= */

export const L_DIRECTIONS: Option[] = [
  { value: "residential", label: "Жилой комплекс" },
  { value: "lowrise", label: "Индивидуальная и малоэтажная жилая застройка" },
  { value: "apartments", label: "Апартаменты" },
  { value: "commercial", label: "Коммерческая недвижимость" },
  { value: "office", label: "Офисный центр" },
  { value: "retail", label: "Торгово-общественный объект" },
  { value: "hotel", label: "Гостиница" },
  { value: "tourist", label: "Туристический комплекс" },
  { value: "recreation", label: "Рекреационный проект" },
  { value: "industrial", label: "Производственно-складской комплекс" },
  { value: "logistics", label: "Логистический объект" },
  { value: "agricultural", label: "Сельскохозяйственный проект" },
  { value: "mixed", label: "Смешанная застройка" },
  { value: "other", label: "Другое" },
  {
    value: "proposals",
    label: "Хочу получить предложения по наиболее перспективным вариантам",
  },
];

/** Параметры проекта для L6 — динамический набор вопросов по направлению. */
const L6_FIELDS: Record<string, { value: string; label: string }[]> = {
  residential: [
    { value: "l_floors", label: "Предполагаемая этажность" },
    { value: "l_class", label: "Класс жилья" },
    { value: "l_area_sale", label: "Предполагаемая площадь реализации, м²" },
    { value: "l_phases", label: "Количество очередей строительства" },
    { value: "l_commercial", label: "Наличие коммерческих помещений" },
    { value: "l_parking", label: "Парковочная обеспеченность" },
  ],
  tourist: [
    { value: "l_format", label: "Формат размещения" },
    { value: "l_rooms", label: "Количество номеров или мест" },
    { value: "l_seasonality", label: "Сезонность" },
    { value: "l_restaurant", label: "Наличие ресторана" },
    { value: "l_spa", label: "СПА и спортивная инфраструктура" },
    { value: "l_extra", label: "Дополнительные услуги" },
  ],
  industrial: [
    { value: "l_purpose", label: "Назначение объекта" },
    { value: "l_area", label: "Требуемая площадь, м²" },
    { value: "l_capacity", label: "Предполагаемая мощность" },
    { value: "l_trucks", label: "Потребность в грузовом транспорте" },
    { value: "l_utility", label: "Требования к инженерным сетям" },
    { value: "l_sanitary", label: "Санитарные и технологические ограничения" },
  ],
  commercial: [
    { value: "l_format", label: "Формат объекта" },
    { value: "l_area", label: "Требуемая площадь, м²" },
    { value: "l_tenants", label: "Целевые арендаторы" },
    { value: "l_parking", label: "Парковочная обеспеченность" },
  ],
  apartment_office_retail: [],
};

const L6_DEFAULT: { value: string; label: string }[] = [
  { value: "l_project_size", label: "Масштаб проекта" },
  { value: "l_estimate", label: "Ориентировочный бюджет, млн ₽" },
];

const L6_GROUPS: Record<string, string> = {
  apartments: "commercial",
  office: "commercial",
  retail: "commercial",
};

/** Поля для блока L6 в зависимости от выбранного направления (п. 4.3). */
export function l6Fields(
  direction: string | undefined,
): { value: string; label: string }[] {
  if (!direction) return [];
  const group = L6_GROUPS[direction] || direction;
  return L6_FIELDS[group] || L6_DEFAULT;
}

export const L_BLOCKS: QuestionBlock[] = [
  {
    id: "l1",
    title: "L1. Направление инвестиционного проекта",
    hint: "Какое направление освоения территории вас интересует?",
    fields: [
      {
        kind: "radio-other",
        key: "l_direction",
        otherKey: "l_direction_other",
        label: "Направление",
        otherValue: "other",
        noDunno: true,
        options: L_DIRECTIONS,
      },
    ],
  },
  {
    id: "l2",
    title: "L2. Цель инвестиционного проекта",
    hint: "Какую основную цель вы преследуете?",
    fields: [
      {
        kind: "radios",
        key: "l_goal",
        label: "Цель",
        options: withDunno([
          { value: "profit", label: "Максимизация прибыли от реализации" },
          { value: "rent", label: "Получение стабильного арендного дохода" },
          {
            value: "asset",
            label: "Создание долгосрочного инвестиционного актива",
          },
          { value: "business", label: "Развитие собственного бизнеса" },
          {
            value: "resale",
            label:
              "Перепродажа участка после повышения инвестиционной привлекательности",
          },
          { value: "social", label: "Реализация социально значимого проекта" },
          { value: "mixed", label: "Смешанная цель" },
        ]),
      },
    ],
  },
  {
    id: "l3",
    title: "L3. Инвестиционный бюджет",
    hint: "Какой общий бюджет вы готовы рассматривать?",
    fields: [
      {
        kind: "radios",
        key: "l_budget",
        label: "Общий бюджет",
        options: withDunno([
          { value: "30", label: "До 30 млн ₽" },
          { value: "30-100", label: "30–100 млн ₽" },
          { value: "100-300", label: "100–300 млн ₽" },
          { value: "300-500", label: "300–500 млн ₽" },
          { value: "500-1000", label: "500 млн – 1 млрд ₽" },
          { value: "1000+", label: "Более 1 млрд ₽" },
        ]),
      },
      {
        kind: "radios",
        key: "l_budget_scope",
        label: "Что входит в бюджет?",
        hint: "Это критично для финансовой модели — иначе система может сравнить бюджет строительства с полной стоимостью проекта.",
        options: withDunno([
          { value: "build", label: "Только строительство" },
          { value: "land+build", label: "Покупка земли и строительство" },
          {
            value: "full-prepare",
            label: "Покупка земли, проектирование, подключения и строительство",
          },
          {
            value: "full",
            label: "Полный бюджет проекта, включая запуск и оборотный капитал",
          },
        ]),
      },
    ],
  },
  {
    id: "l4",
    title: "L4. Сроки реализации",
    hint: "В какие сроки вы планируете реализовать проект?",
    fields: [
      {
        kind: "radios",
        key: "l_start",
        label: "Начало реализации",
        options: withDunno([
          { value: "6m", label: "Начать в течение 6 месяцев" },
          { value: "1y", label: "Начать в течение 1 года" },
          { value: "2-3y", label: "Начать в течение 2–3 лет" },
        ]),
      },
      {
        kind: "radios",
        key: "l_phasing",
        label: "Реализация",
        options: withDunno([
          { value: "phased", label: "Поэтапная" },
          { value: "once", label: "Единовременная" },
        ]),
      },
      {
        kind: "text",
        key: "l_build_time",
        label: "Желаемая продолжительность строительства",
        placeholder: "Например: 18 месяцев",
        optional: true,
      },
    ],
  },
  {
    id: "l5",
    title: "L5. Требования к доходности",
    hint: "Какие финансовые параметры для вас важны? Если вы не знакомы с показателями — просто оставьте «Не знаю», мы предложим ориентиры.",
    fields: [
      {
        kind: "text",
        key: "l_payback",
        label: "Желаемый срок окупаемости",
        placeholder: "Например: до 8 лет",
        optional: true,
      },
      {
        kind: "text",
        key: "l_yield",
        label: "Минимальная требуемая доходность",
        placeholder: "Например: 16% годовых",
        optional: true,
      },
      {
        kind: "text",
        key: "l_irr",
        label: "Целевая внутренняя норма доходности (IRR), если известна",
        placeholder: "Например: 20%",
        optional: true,
      },
      {
        kind: "radios",
        key: "l_priority",
        label: "Приоритет",
        options: withDunno([
          { value: "payback", label: "Быстрая окупаемость" },
          { value: "asset", label: "Долгосрочная стоимость актива" },
        ]),
      },
    ],
  },
  {
    id: "l6",
    title: "L6. Параметры проекта",
    hint: "Вопросы зависят от выбранного направления освоения.",
    fields: [],
  },
  {
    id: "l7",
    title: "L7. Предпочтения и ограничения инвестора",
    fields: [
      {
        kind: "checkboxes",
        key: "l_constraints",
        label: "Ограничения и предпочтения",
        options: [
          { value: "rework", label: "Допустимость изменения концепции" },
          {
            value: "variants",
            label: "Готовность рассматривать несколько вариантов",
          },
          { value: "phased", label: "Предпочтение поэтапного освоения" },
          {
            value: "keep",
            label: "Необходимость сохранения существующих объектов",
          },
          { value: "eco", label: "Экологические требования" },
          {
            value: "transport",
            label: "Требования к транспортной доступности",
          },
        ],
      },
      {
        kind: "textarea",
        key: "l_extra",
        label:
          "Какие дополнительные критерии должны учитываться при оценке участка?",
        placeholder: "Особые условия и пожелания…",
        optional: true,
      },
    ],
  },
];

/* ---------- Хелперы ---------- */

/** Превращает значение «не знаю» в человекочитаемое «расчётное допущение». */
export const DUNNO_LABEL = "Не знаю / определите самостоятельно";

export const isDunno = (v: string | undefined): boolean => v === DUNNO;

export const HUMAN_DUNNO = "Не знаю (расчётное допущение)";

/** Читаемая подпись выбранного значения для сводки заказа. */
export function labelOf(
  field: QuestionField,
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  if (value === DUNNO) return HUMAN_DUNNO;
  if (field.kind === "checkboxes") {
    const selected = (value || "").split(",").filter(Boolean);
    if (!selected.length) return undefined;
    return selected
      .map((v) => field.options.find((o) => o.value === v)?.label ?? v)
      .join("; ");
  }
  if (field.kind === "text" || field.kind === "textarea") return value;
  const opt = field.options.find((o) => o.value === value);
  const label = opt?.label ?? value;
  if (field.kind === "radio-other" && value === field.otherValue) {
    return label + (field.otherKey ? " (уточнение ниже)" : "");
  }
  return label;
}
