import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { Field } from "@/shared/ui/Field";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Card, CardTitle } from "@/shared/ui/Card";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import {
  IconCheck,
  IconChevronRight,
  IconClose,
  IconMail,
  IconPlus,
  IconWarning,
} from "@/shared/icons";
import { getLevels, type Level } from "@/entities/level/api";
import {
  getParcel,
  getMutualInfo,
  type MutualInfo,
  type Parcel,
} from "@/entities/parcel/api";
import { getOffer, type Offer } from "@/entities/offer/api";
import { createOrder, type CustomerInfo } from "@/entities/order/api";
import { isCadastral, isEmail } from "@/shared/lib/validators";
import { fmtPrice } from "@/shared/lib/format";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/app/providers/auth";
import {
  stepsFor,
  stepLabel,
  LEVEL_META,
  type WizardStepId,
} from "../lib/stepper";
import {
  M_BLOCKS,
  L_BLOCKS,
  l6Fields,
  labelOf,
  type QuestionBlock,
  type QuestionField,
} from "../lib/questions";
import "./wizard.scss";

/* ---------- Сравнение уровней (таблица из п. 3.4 User Journey) ---------- */

const COMPARISON: { label: string; s: string; m: string; l: string }[] = [
  { label: "Анализ кадастровых сведений", s: "✓", m: "✓", l: "✓" },
  { label: "Проверка ограничений", s: "✓", m: "✓", l: "✓" },
  { label: "Проверка возможности размещения дома", s: "✓", m: "✓", l: "✓" },
  { label: "Отступы и предварительные габариты", s: "✓", m: "✓", l: "✓" },
  { label: "Инженерная инфраструктура", s: "✓", m: "✓", l: "✓" },
  { label: "Несколько участков", s: "Опционально", m: "✓", l: "✓" },
  { label: "Несколько домов", s: "—", m: "✓", l: "✓" },
  { label: "Схема планировочной организации", s: "—", m: "✓", l: "✓" },
  { label: "Анализ соседних участков", s: "—", m: "✓", l: "✓" },
  { label: "Потенциал расширения территории", s: "—", m: "✓", l: "✓" },
  { label: "Выбор инвестиционного направления", s: "—", m: "—", l: "✓" },
  { label: "Функциональная программа проекта", s: "—", m: "—", l: "✓" },
  { label: "Предварительная финансовая модель", s: "—", m: "—", l: "✓" },
  { label: "Сценарии и оценка окупаемости", s: "—", m: "—", l: "✓" },
];

/* ---------- Тип заказчика и поля форм (шаги 4–5, п. 5 User Journey) ---------- */

export type CustomerType = "person" | "ip" | "company";

const CUSTOMER_OPTIONS: {
  value: CustomerType;
  title: string;
  hint: string;
}[] = [
  {
    value: "person",
    title: "Физическое лицо",
    hint: "Для личного заказа и ИЖД",
  },
  {
    value: "ip",
    title: "Индивидуальный предприниматель",
    hint: "Отдельная форма — не юрлицо",
  },
  {
    value: "company",
    title: "Юридическое лицо",
    hint: "Организация, реквизиты юрлица",
  },
];

type CustomerFieldDef = {
  key: keyof CustomerInfo;
  label: string;
  placeholder?: string;
  required?: boolean;
  span?: 2;
};

const CUSTOMER_FIELDS: Record<CustomerType, CustomerFieldDef[]> = {
  person: [
    { key: "lastName", label: "Фамилия", required: true },
    { key: "firstName", label: "Имя", required: true },
    { key: "middleName", label: "Отчество" },
    { key: "email", label: "Email для результата", required: true },
    {
      key: "phone",
      label: "Телефон (необязательно)",
      placeholder: "+7 (900) 123-45-67",
    },
  ],
  ip: [
    { key: "lastName", label: "Фамилия", required: true },
    { key: "firstName", label: "Имя", required: true },
    { key: "middleName", label: "Отчество" },
    { key: "inn", label: "ИНН", required: true, placeholder: "10 или 12 цифр" },
    { key: "ogrnip", label: "ОГРНИП", required: true, placeholder: "15 цифр" },
    { key: "email", label: "Email", required: true },
    {
      key: "phone",
      label: "Телефон (необязательно)",
      placeholder: "+7 (900) 123-45-67",
    },
  ],
  company: [
    {
      key: "companyName",
      label: "Полное наименование",
      required: true,
      span: 2,
    },
    { key: "innCompany", label: "ИНН", required: true, placeholder: "10 цифр" },
    { key: "kpp", label: "КПП", required: true, placeholder: "9 цифр" },
    { key: "ogrn", label: "ОГРН", required: true, placeholder: "13 цифр" },
    {
      key: "legalAddress",
      label: "Юридический адрес",
      required: true,
      span: 2,
    },
    {
      key: "representative",
      label: "ФИО представителя",
      required: true,
      span: 2,
    },
    { key: "position", label: "Должность представителя" },
    { key: "email", label: "Email", required: true },
    {
      key: "phone",
      label: "Телефон (необязательно)",
      placeholder: "+7 (900) 123-45-67",
    },
  ],
};

/** Резюме данных заказчика для сводки перед оплатой. */
function customerSummary(customer: CustomerInfo | null): string[] {
  if (!customer) return [];
  const out: string[] = [];
  if (customer.type === "person")
    out.push(
      "Физическое лицо",
      [customer.lastName, customer.firstName, customer.middleName]
        .filter(Boolean)
        .join(" "),
    );
  if (customer.type === "ip")
    out.push(
      "Индивидуальный предприниматель",
      [customer.lastName, customer.firstName, customer.middleName]
        .filter(Boolean)
        .join(" "),
      customer.inn ? "ИНН " + customer.inn : "",
      customer.ogrnip ? "ОГРНИП " + customer.ogrnip : "",
    );
  if (customer.type === "company")
    out.push(
      "Юридическое лицо",
      customer.companyName || "",
      [
        customer.innCompany && "ИНН " + customer.innCompany,
        customer.kpp && "КПП " + customer.kpp,
        customer.ogrn && "ОГРН " + customer.ogrn,
      ]
        .filter(Boolean)
        .join(", "),
      customer.legalAddress || "",
      [customer.representative, customer.position].filter(Boolean).join(", "),
    );
  out.push("Email: " + customer.email);
  if (customer.phone) out.push("Телефон: " + customer.phone);
  return out.filter(Boolean);
}

/* ---------- Степы ---------- */

function StepBar({
  current,
  steps,
  level,
}: {
  current: WizardStepId;
  steps: WizardStepId[];
  level: string | null;
}) {
  return (
    <div className="wizard-steps" aria-label="Шаги оформления заказа">
      {steps.map((s, i) => {
        const done = s < current;
        const active = s === current;
        return (
          <div
            key={s}
            className={`wizard-steps__item${active ? " is-active" : ""}${done ? " is-done" : ""}`}
          >
            <span className="wizard-steps__num">
              {done ? <IconCheck size={14} /> : s}
            </span>
            <span className="wizard-steps__label">{stepLabel(s, level)}</span>
            {i < steps.length - 1 && <span className="wizard-steps__line" />}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Карточка найденного участка ---------- */

function ParcelCard({
  parcel,
  onRemove,
  index,
}: {
  parcel: Parcel;
  onRemove?: () => void;
  index?: number;
}) {
  return (
    <div className="parcel-card">
      {index !== undefined && (
        <button
          type="button"
          className="parcel-card__remove"
          onClick={onRemove}
          aria-label={"Удалить участок " + parcel.cadastral}
        >
          <IconClose size={14} />
        </button>
      )}
      <div className="parcel-card__address">
        {index !== undefined && (
          <b className="parcel-card__num">{index + 1}.</b>
        )}{" "}
        {parcel.address}
      </div>
      <div className="parcel-card__grid">
        <div>
          <b>Кадастровый номер:</b> {parcel.cadastral}
        </div>
        <div>
          <b>Площадь:</b> {parcel.area}
        </div>
        <div>
          <b>Категория:</b> {parcel.category}
        </div>
        <div>
          <b>ВРИ:</b> {parcel.vri}
        </div>
        <div>
          <b>Кадастровая стоимость:</b> {parcel.cadastralValue}
        </div>
      </div>
      {parcel.restrictions.length > 0 && (
        <div className="parcel-card__restrictions">
          <b>Ограничения:</b> {parcel.restrictions.join("; ")}
        </div>
      )}
    </div>
  );
}

/* ---------- Мелкие контролы анкет ---------- */

function RadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="q-options">
      {options.map((o) => (
        <label
          key={o.value}
          className={"q-option" + (value === o.value ? " is-checked" : "")}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

function CheckboxGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <div className="q-options">
      {options.map((o) => (
        <label
          key={o.value}
          className={
            "q-option" + (value.includes(o.value) ? " is-checked" : "")
          }
        >
          <input
            type="checkbox"
            checked={value.includes(o.value)}
            onChange={() => toggle(o.value)}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

type ParamState = Record<string, string>;

function QuestionFieldControl({
  field,
  state,
  onChange,
}: {
  field: QuestionField;
  state: ParamState;
  onChange: (key: string, value: string) => void;
}) {
  const value = state[field.key] ?? "";
  switch (field.kind) {
    case "radios":
      return (
        <RadioGroup
          name={field.key}
          options={field.options}
          value={value}
          onChange={(v) => onChange(field.key, v)}
        />
      );
    case "radio-other":
      return (
        <>
          <RadioGroup
            name={field.key}
            options={field.options}
            value={value}
            onChange={(v) => onChange(field.key, v)}
          />
          {field.otherValue && value === field.otherValue && (
            <Field label="Пояснение">
              <Input
                value={state[field.otherKey] ?? ""}
                onChange={(e) => onChange(field.otherKey, e.target.value)}
                placeholder="Уточните вариант…"
              />
            </Field>
          )}
        </>
      );
    case "checkboxes":
      return (
        <CheckboxGroup
          options={field.options}
          value={(value || "").split(",").filter(Boolean)}
          onChange={(v) => onChange(field.key, v.join(","))}
        />
      );
    case "select":
      return (
        <select
          className="select"
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
        >
          <option value="">— выберите —</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "text":
      return (
        <Input
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
      );
    case "textarea":
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          style={{ minHeight: 96 }}
        />
      );
  }
}

function QuestionBlockView({
  block,
  state,
  onChange,
}: {
  block: QuestionBlock;
  state: ParamState;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <section className="q-block">
      <h4 className="q-block__title">{block.title}</h4>
      {block.hint && <p className="q-block__hint">{block.hint}</p>}
      {block.fields.map((f) => (
        <Field
          key={f.key}
          label={f.label}
          hint={"hint" in f ? f.hint : undefined}
        >
          <QuestionFieldControl field={f} state={state} onChange={onChange} />
        </Field>
      ))}
    </section>
  );
}

/* ---------- Визард ---------- */

export function OrderWizard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const [levels, setLevels] = useState<Level[] | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [step, setStep] = useState<WizardStepId>(1);

  /* Шаг 1: участки */
  const [cadastralInput, setCadastralInput] = useState("");
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [mutual, setMutual] = useState<MutualInfo | null>(null);
  const [mutualError, setMutualError] = useState<string | null>(null);
  const [mutualConfirmed, setMutualConfirmed] = useState(false);

  /* Шаг 2: уровень */
  const [level, setLevel] = useState<string>(params.get("level") ?? "");
  const [downgradeNote, setDowngradeNote] = useState<string | null>(null);

  /* Шаг 3: параметры M/L */
  const [projectParams, setProjectParams] = useState<ParamState>({});

  /* Шаги 4–5: заказчик */
  const [customerType, setCustomerType] = useState<CustomerType>("person");
  const [customer, setCustomer] = useState<Record<string, string>>({});
  const [consentPd, setConsentPd] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);

  /* Шаг 6: оферта и отправка */
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getLevels()
      .then(setLevels)
      .catch(() => setLevels([]));
    getOffer()
      .then((r) => setOffer(r.offer))
      .catch(() => setOffer(null));
  }, []);

  /* Предзаполнение контактов из профиля (шаг 5). */
  useEffect(() => {
    if (!user) return;
    setCustomer((prev) => ({
      ...prev,
      lastName: prev.lastName || user.lastName,
      firstName: prev.firstName || user.firstName,
      email: prev.email || user.email,
      phone: prev.phone || user.phone,
    }));
  }, [user]);

  const steps = useMemo(() => stepsFor(level, step), [step, level]);
  const selectedLevel = levels?.find((l) => l.id === level) ?? null;

  /* L6: динамические поля по направлению (п. 4.3). */
  const lBlocks = useMemo(() => {
    const direction = projectParams["l_direction"];
    return L_BLOCKS.map((b) =>
      b.id === "l6"
        ? {
            ...b,
            fields: l6Fields(direction).map((f): QuestionField => ({
              kind: "text",
              key: f.value,
              label: f.label,
              optional: true,
            })),
          }
        : b,
    );
  }, [projectParams["l_direction"]]); // eslint-disable-line react-hooks/exhaustive-deps

  const paramsBlocks = level === "m" ? M_BLOCKS : lBlocks;
  const l6Empty =
    level === "l" &&
    (lBlocks.find((b) => b.id === "l6")?.fields.length ?? 0) === 0;

  /* Проверка взаимного расположения при изменении списка участков. */
  useEffect(() => {
    if (parcels.length < 2) {
      setMutual(null);
      setMutualError(null);
      return;
    }
    let cancelled = false;
    setMutual(null);
    setMutualError(null);
    setMutualConfirmed(false);
    getMutualInfo(parcels.map((p) => p.cadastral))
      .then((m) => {
        if (!cancelled) setMutual(m);
      })
      .catch((err) => {
        if (!cancelled)
          setMutualError(
            err instanceof Error
              ? err.message
              : "Не удалось проверить расположение участков.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [parcels]);

  /* Шаг 1: проверка и добавление участка */
  async function addParcel() {
    setCheckError(null);
    const c = cadastralInput.trim();
    if (!isCadastral(c)) {
      setCheckError(
        "Кадастровый номер должен быть в формате XX:XX:XXXXXXX:XXX.",
      );
      return;
    }
    if (parcels.some((p) => p.cadastral === c)) {
      setCheckError("Этот участок уже добавлен.");
      return;
    }
    if (parcels.length >= 10) {
      setCheckError("Максимум 10 участков в одном заказе.");
      return;
    }
    setChecking(true);
    try {
      const res = await getParcel(c);
      setParcels((prev) => [...prev, res.parcel]);
      setCadastralInput("");
    } catch (err) {
      setCheckError(
        err instanceof ApiError ? err.message : "Не удалось проверить участок.",
      );
    } finally {
      setChecking(false);
    }
  }

  function removeParcel(index: number) {
    setParcels((prev) => prev.filter((_, i) => i !== index));
    if (parcels.length <= 2) setMutualConfirmed(false);
  }

  /* Шаг 2: выбор уровня */
  function selectLevel(id: string, available: boolean) {
    if (!available) return;
    /* Понижение уровня: параметры M/L больше не используются. */
    if ((level === "l" || level === "m") && id === "s") {
      setDowngradeNote(
        "При переходе на S часть выбранных параметров проекта не будет использоваться. Вы сможете вернуться и уточнить уровень до оплаты.",
      );
    } else {
      setDowngradeNote(null);
    }
    setLevel(id);
    /* П. 3.5: при выборе S сразу переходим к типу заказчика. */
    if (id === "s") setStep(4);
  }

  /* Шаг 3: параметры */
  function setParam(key: string, value: string) {
    setProjectParams((prev) => ({ ...prev, [key]: value }));
  }

  /* Шаги 4–5: заказчик */
  const customerFields =
    CUSTOMER_FIELDS[customerType] ?? CUSTOMER_FIELDS.person;

  function setCustomerField(key: string, value: string) {
    setCustomer((prev) => ({ ...prev, [key]: value }));
  }

  function customerRequiredMissing(): string | null {
    for (const f of customerFields) {
      if (f.required && !String(customer[f.key] ?? "").trim())
        return "Заполните поле «" + f.label + "».";
    }
    const email = String(customer.email ?? "").trim();
    if (!isEmail(email)) return "Укажите корректный email.";
    return null;
  }

  /* Навигация */
  function goNext() {
    setSubmitError(null);
    if (step === 2 && !level) return;

    if (step === 6) return; // отправка — через submit()

    const next = steps[steps.indexOf(step) + 1];
    if (next) setStep(next);
  }

  function goPrev() {
    const prev = steps[steps.indexOf(step) - 1];
    if (prev) {
      setStep(prev);
      setSubmitError(null);
    }
  }

  function stepReady(): boolean {
    if (step === 1) {
      if (parcels.length === 0) return false;
      if (mutual && !mutual.allAdjacent && !mutualConfirmed) return false;
      return mutualError == null;
    }
    if (step === 2) return Boolean(level);
    if (step === 3) return true; // анкеты можно оставить частично заполненными
    if (step === 4) return customerRequiredMissing() == null;
    if (step === 5)
      return consentPd && isEmail(String(customer.email ?? "").trim());
    if (step === 6) return offerAccepted;
    return true;
  }

  async function submit() {
    if (!offer || parcels.length === 0 || !selectedLevel) return;
    setSubmitError(null);
    setSubmitting(true);
    const customerPayload: CustomerInfo = {
      type: customerType,
      email: String(customer.email ?? "").trim(),
      phone: String(customer.phone ?? "").trim() || undefined,
      ...(customerType === "person" || customerType === "ip"
        ? {
            lastName: String(customer.lastName ?? "").trim(),
            firstName: String(customer.firstName ?? "").trim(),
            middleName: String(customer.middleName ?? "").trim() || undefined,
          }
        : {}),
      ...(customerType === "ip"
        ? {
            inn: String(customer.inn ?? "").trim(),
            ogrnip: String(customer.ogrnip ?? "").trim(),
          }
        : {}),
      ...(customerType === "company"
        ? {
            companyName: String(customer.companyName ?? "").trim(),
            innCompany: String(customer.innCompany ?? "").trim(),
            kpp: String(customer.kpp ?? "").trim(),
            ogrn: String(customer.ogrn ?? "").trim(),
            legalAddress: String(customer.legalAddress ?? "").trim(),
            representative: String(customer.representative ?? "").trim(),
            position: String(customer.position ?? "").trim() || undefined,
          }
        : {}),
    };
    try {
      const res = await createOrder({
        cadastrals: parcels.map((p) => p.cadastral),
        cadastral: parcels[0].cadastral,
        level,
        offerAccepted: true,
        offerVersion: offer.version,
        customer: customerPayload,
        params: projectParams,
      });
      navigate("/order/" + res.order.id + "/pay");
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Не удалось создать заказ.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!levels || !offer) {
    return (
      <Card padded>
        <Spinner /> Загружаем тарифы и оферту…
      </Card>
    );
  }

  return (
    <div className="wizard">
      <StepBar current={step} steps={steps} level={level} />

      {submitError && <Alert tone="error">{submitError}</Alert>}

      <Card padded>
        {/* Шаг 1: участки */}
        {step === 1 && (
          <div>
            <CardTitle>Выберите земельные участки</CardTitle>
            <p className="card-sub">
              Введите один или несколько кадастровых номеров в формате{" "}
              <b>XX:XX:XXXXXXX:XXX</b> — мы проверим каждый участок по открытым
              данным и покажем взаимное расположение. Платная генерация начнётся
              только после оплаты.
            </p>

            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <Input
                  value={cadastralInput}
                  placeholder="36:16:3405742:189"
                  onChange={(e) => setCadastralInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addParcel()}
                  invalid={Boolean(checkError)}
                />
                {checkError && (
                  <div className="field__error" style={{ marginTop: 6 }}>
                    {checkError}
                  </div>
                )}
              </div>
              <Button
                onClick={addParcel}
                disabled={checking}
                icon={checking ? <Spinner /> : <IconPlus size={16} />}
              >
                Добавить участок
              </Button>
            </div>

            {parcels.length > 0 && (
              <div className="parcel-list">
                {parcels.map((p, i) => (
                  <ParcelCard
                    key={p.cadastral}
                    parcel={p}
                    index={i}
                    onRemove={() => removeParcel(i)}
                  />
                ))}
              </div>
            )}

            {parcels.length > 0 && (
              <div className="parcel-summary">
                <b>
                  Выбрано участков: {parcels.length}.{" "}
                  {parcels.length > 1 && mutual
                    ? "Общая площадь: " + mutual.totalArea + "."
                    : "Площадь: " + parcels[0].area + "."}
                </b>
                {parcels.length === 1 && (
                  <span className="muted" style={{ fontSize: 13 }}>
                    {" "}
                    Для уровня S достаточно одного участка; для M и L удобнее
                    анализировать несколько.
                  </span>
                )}
              </div>
            )}

            {parcels.length >= 2 && mutual && (
              <div
                className={
                  "mutual" +
                  (mutual.allAdjacent ? " mutual--ok" : " mutual--warn")
                }
              >
                <div className="mutual__head">
                  {mutual.allAdjacent ? (
                    <IconCheck size={16} />
                  ) : (
                    <IconWarning size={16} />
                  )}
                  <b>
                    {mutual.allAdjacent
                      ? "Участки соприкасаются границами"
                      : "Участки не соприкасаются"}
                  </b>
                </div>
                <div className="mutual__pairs">
                  {mutual.pairs.map((p) => (
                    <div key={p.a + p.b}>
                      {p.a} — {p.b}:{" "}
                      {p.adjacent
                        ? "общая граница"
                        : "расстояние " + p.distance}
                    </div>
                  ))}
                </div>
                {!mutual.allAdjacent && (
                  <Checkbox
                    checked={mutualConfirmed}
                    onChange={(e) => setMutualConfirmed(e.target.checked)}
                    label="Продолжить анализ с не соприкасающимися участками"
                  />
                )}
              </div>
            )}
            {parcels.length >= 2 && mutualError && (
              <Alert tone="error">{mutualError}</Alert>
            )}

            <div style={{ marginTop: 14 }}>
              <Alert tone="info">
                Выбранные сведения — исходные данные для аналитики, а не
                результат юридической экспертизы: допустимость строительства
                оценивается в рамках выбранного уровня анализа.
              </Alert>
            </div>

            <div className="form-actions">
              <Button variant="accent" disabled={!stepReady()} onClick={goNext}>
                Далее <IconChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Шаг 2: уровень */}
        {step === 2 && (
          <div>
            <CardTitle>Выберите уровень анализа</CardTitle>
            <p className="card-sub">
              От уровня зависит глубина проработки, срок и цена отчёта. M
              включает весь состав S, L — весь состав M: это уровни детализации
              одной аналитики, а не независимые отчёты.
            </p>

            {downgradeNote && <Alert tone="warn">{downgradeNote}</Alert>}

            <div className="level-select">
              {levels.map((l) => {
                const active = level === l.id;
                const meta = LEVEL_META[l.id];
                return (
                  <button
                    key={l.id}
                    type="button"
                    className={`level-select__item${active ? " is-active" : ""}${l.available === false ? " is-disabled" : ""}`}
                    onClick={() => selectLevel(l.id, l.available !== false)}
                    disabled={l.available === false}
                  >
                    <div className="level-select__top">
                      <span
                        className="level-select__badge"
                        style={{ color: meta.color }}
                      >
                        {meta.short}
                      </span>
                      <b>{l.name.replace(/^[SML] — /, "")}</b>
                    </div>
                    <div className="level-select__tag">{l.tagline}</div>
                    <div className="level-select__meta">
                      <span>{l.duration}</span>
                      <b>{fmtPrice(l.price)}</b>
                    </div>
                    <details className="level-select__details">
                      <summary>Состав и результат</summary>
                      <ul>
                        {(l.includes ?? []).map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                      {l.id === "m" && (
                        <span className="muted" style={{ fontSize: 12 }}>
                          Включает весь состав S.
                        </span>
                      )}
                      {l.id === "l" && (
                        <span className="muted" style={{ fontSize: 12 }}>
                          Включает весь состав S и M.
                        </span>
                      )}
                    </details>
                    {l.available === false && (
                      <div className="level-select__off">
                        Временно недоступен
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <details className="comparison">
              <summary>Сравнение уровней S / M / L</summary>
              <table className="comparison__table">
                <thead>
                  <tr>
                    <th>Возможность</th>
                    <th>S</th>
                    <th>M</th>
                    <th>L</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.s}</td>
                      <td>{row.m}</td>
                      <td>{row.l}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            <div className="form-actions">
              <Button variant="ghost" onClick={goPrev}>
                Назад
              </Button>
              <Button variant="accent" disabled={!stepReady()} onClick={goNext}>
                Далее <IconChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Шаг 3: параметры M / L */}
        {step === 3 && (
          <div>
            <CardTitle>
              {level === "m"
                ? "Параметры проекта (M)"
                : "Инвестиционное задание (L)"}
            </CardTitle>
            <p className="card-sub">
              {level === "m"
                ? "Несколько коротких вопросов — система учтёт модель освоения, количество объектов и требования к территории."
                : "Вы формируете исходное инвестиционное задание: направление, бюджет, сроки и доходность. Незаполненные показатели будут приняты как расчётные допущения и отмечены в отчёте."}
            </p>

            {paramsBlocks.map((b) => (
              <QuestionBlockView
                key={b.id}
                block={b}
                state={projectParams}
                onChange={setParam}
              />
            ))}

            {level === "l" && l6Empty && (
              <Alert tone="info">
                Выберите направление инвестиционного проекта (блок L1) — тогда
                появятся уточняющие параметры проекта.
              </Alert>
            )}

            <div className="form-actions">
              <Button variant="ghost" onClick={goPrev}>
                Назад
              </Button>
              <Button variant="accent" onClick={goNext}>
                Далее <IconChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Шаг 4: тип заказчика */}
        {step === 4 && (
          <div>
            <CardTitle>Тип заказчика</CardTitle>
            <p className="card-sub">
              От типа зависят документы и платёжные реквизиты. ИП — отдельный
              вариант: это не организационно-правовая форма юрлица.
            </p>

            <div className="customer-type">
              {CUSTOMER_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={
                    "customer-type__item" +
                    (customerType === c.value ? " is-active" : "")
                  }
                  onClick={() => setCustomerType(c.value)}
                >
                  <b>{c.title}</b>
                  <span className="muted">{c.hint}</span>
                </button>
              ))}
            </div>

            <div className="customer-fields grid-2">
              {customerFields.map((f) => (
                <div
                  key={f.key}
                  style={f.span === 2 ? { gridColumn: "1 / -1" } : undefined}
                >
                  <Field label={f.label + (f.required ? " *" : "")}>
                    <Input
                      value={String(customer[f.key] ?? "")}
                      placeholder={f.placeholder}
                      onChange={(e) => setCustomerField(f.key, e.target.value)}
                    />
                  </Field>
                </div>
              ))}
            </div>
            {customerRequiredMissing() && (
              <div className="field__error">{customerRequiredMissing()}</div>
            )}

            <div className="form-actions">
              <Button variant="ghost" onClick={goPrev}>
                Назад
              </Button>
              <Button variant="accent" disabled={!stepReady()} onClick={goNext}>
                Далее <IconChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Шаг 5: контакты и согласия */}
        {step === 5 && (
          <div>
            <CardTitle>Контакты и согласия</CardTitle>
            <p className="card-sub">
              Вы авторизованы — заказ привяжется к аккаунту, история сохранится
              в личном кабинете. Телефон не обязателен, если он не нужен для
              оплаты или подтверждения.
            </p>

            <div className="grid-2">
              <Field label="Email для результата *">
                <Input
                  value={String(customer.email ?? "")}
                  onChange={(e) => setCustomerField("email", e.target.value)}
                />
              </Field>
              <Field label="Телефон (необязательно)">
                <Input
                  value={String(customer.phone ?? "")}
                  placeholder="+7 (900) 123-45-67"
                  onChange={(e) => setCustomerField("phone", e.target.value)}
                />
              </Field>
            </div>

            <div className="consents">
              <Checkbox
                checked={consentPd}
                onChange={(e) => setConsentPd(e.target.checked)}
                label={
                  <>
                    Я согласен на обработку персональных данных в соответствии с{" "}
                    <Link to="/documents?doc=privacy" target="_blank">
                      политикой обработки ПДн
                    </Link>{" "}
                    (обязательно)
                  </>
                }
              />
              <Checkbox
                checked={consentMarketing}
                onChange={(e) => setConsentMarketing(e.target.checked)}
                label="Согласен получать рекламные рассылки (необязательно)"
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <Alert tone="info">
                <IconMail size={14} /> На{" "}
                {String(customer.email || "ваш email")} придёт подтверждение
                заказа и уведомление о готовности отчёта.
              </Alert>
            </div>

            <div className="form-actions">
              <Button variant="ghost" onClick={goPrev}>
                Назад
              </Button>
              <Button variant="accent" disabled={!stepReady()} onClick={goNext}>
                Далее <IconChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Шаг 6: проверка заказа + оферта */}
        {step === 6 && parcels.length > 0 && selectedLevel && (
          <div>
            <CardTitle>Проверьте заказ</CardTitle>
            <p className="card-sub">
              После оплаты состав услуги изменить нельзя: сверьте данные перед
              оформлением.
            </p>

            <div className="summary">
              <div className="summary__group">
                <div className="summary__group-title">1. Участки</div>
                {parcels.map((p) => (
                  <div className="summary__row" key={p.cadastral}>
                    <span className="muted">{p.cadastral}</span>
                    <span>{p.address}</span>
                  </div>
                ))}
                <div className="summary__row">
                  <span className="muted">
                    Всего участков: {parcels.length}
                  </span>
                  <b>Общая площадь: {mutual?.totalArea ?? parcels[0].area}</b>
                </div>
              </div>

              <div className="summary__group">
                <div className="summary__group-title">2. Уровень анализа</div>
                <div className="summary__row">
                  <span className="muted">Услуга</span>
                  <b>{selectedLevel.name}</b>
                </div>
                <div className="summary__row">
                  <span className="muted">Срок</span>
                  <span>{selectedLevel.duration}</span>
                </div>
                <div className="summary__row">
                  <span className="muted">Состав</span>
                  <span>{(selectedLevel.includes ?? []).join("; ")}</span>
                </div>
              </div>

              {level !== "s" && (
                <div className="summary__group">
                  <div className="summary__group-title">
                    3. Параметры задания
                  </div>
                  {Object.keys(projectParams)
                    .filter((k) => String(projectParams[k] ?? "").trim())
                    .map((k) => {
                      const block = paramsBlocks.find((b) =>
                        b.fields.some((f) => f.key === k),
                      );
                      const field = block?.fields.find((f) => f.key === k);
                      if (!field) return null;
                      return (
                        <div className="summary__row" key={k}>
                          <span className="muted">
                            {block?.id === "l6"
                              ? field.label
                              : (block?.title ?? "") + " · " + field.label}
                          </span>
                          <span>
                            {labelOf(field, projectParams[k]) ??
                              projectParams[k]}
                          </span>
                        </div>
                      );
                    })}
                  <div className="summary__row muted">
                    <span>
                      Расчётные допущения по незаполненным показателям будут
                      отмечены в отчёте.
                    </span>
                    <span />
                  </div>
                </div>
              )}

              <div className="summary__group">
                <div className="summary__group-title">4. Заказчик</div>
                {customerSummary({
                  type: customerType,
                  email: String(customer.email ?? "").trim(),
                  phone: String(customer.phone ?? "").trim() || undefined,
                  lastName: String(customer.lastName ?? "").trim(),
                  firstName: String(customer.firstName ?? "").trim(),
                  middleName:
                    String(customer.middleName ?? "").trim() || undefined,
                  inn: String(customer.inn ?? "").trim(),
                  ogrnip: String(customer.ogrnip ?? "").trim(),
                  companyName: String(customer.companyName ?? "").trim(),
                  innCompany: String(customer.innCompany ?? "").trim(),
                  kpp: String(customer.kpp ?? "").trim(),
                  ogrn: String(customer.ogrn ?? "").trim(),
                  legalAddress: String(customer.legalAddress ?? "").trim(),
                  representative: String(customer.representative ?? "").trim(),
                  position: String(customer.position ?? "").trim() || undefined,
                }).map((line) => (
                  <div className="summary__row" key={line}>
                    <span className="muted">{line}</span>
                    <span />
                  </div>
                ))}
              </div>

              <div className="summary__group">
                <div className="summary__group-title">5. Стоимость</div>
                <div className="summary__row">
                  <span className="muted">Услуга ({level.toUpperCase()})</span>
                  <span>{fmtPrice(selectedLevel.price)}</span>
                </div>
                <div className="summary__row summary__row--total">
                  <span>Итого к оплате</span>
                  <b className="grad-text">{fmtPrice(selectedLevel.price)}</b>
                </div>
              </div>

              <div className="summary__group">
                <div className="summary__group-title">6. Документы</div>
                <div className="summary__row">
                  <span className="muted">Оферта</span>
                  <span>
                    <Link to="/documents?doc=offer" target="_blank">
                      публичная оферта v{offer.version}
                    </Link>{" "}
                    ·{" "}
                    <Link to="/documents?doc=privacy" target="_blank">
                      политика ПДн
                    </Link>{" "}
                    ·{" "}
                    <Link to="/documents?doc=refunds" target="_blank">
                      возврат средств
                    </Link>
                  </span>
                </div>
              </div>
            </div>

            <div className="consents">
              <Checkbox
                checked={offerAccepted}
                onChange={(e) => setOfferAccepted(e.target.checked)}
                label={
                  <>
                    Я принимаю условия{" "}
                    <Link to="/documents?doc=offer" target="_blank">
                      публичной оферты
                    </Link>{" "}
                    (v{offer.version}) и даю согласие на обработку персональных
                    данных. Нажимая «Оформить и оплатить», вы подтверждаете
                    согласие с условиями оферты (обязательно)
                  </>
                }
              />
            </div>

            <div className="form-actions">
              <Button variant="ghost" onClick={goPrev}>
                Назад
              </Button>
              <Button
                variant="accent"
                onClick={submit}
                disabled={submitting || !offerAccepted}
              >
                {submitting ? "Создаём заказ…" : "Оформить и перейти к оплате"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
