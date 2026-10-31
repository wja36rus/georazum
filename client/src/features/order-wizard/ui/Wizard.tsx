import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Field } from "@/shared/ui/Field";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Card, CardTitle } from "@/shared/ui/Card";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import { IconCheck, IconChevronRight, IconSearch } from "@/shared/icons";
import { getLevels, type Level } from "@/entities/level/api";
import { getParcel, type Parcel } from "@/entities/parcel/api";
import { getOffer, type Offer } from "@/entities/offer/api";
import { createOrder } from "@/entities/order/api";
import { isCadastral } from "@/shared/lib/validators";
import { fmtPrice } from "@/shared/lib/format";
import { ApiError } from "@/shared/api/client";
import {
  stepsFor,
  STEP_LABELS,
  LEVEL_META,
  type WizardStepId,
} from "../lib/stepper";
import "./wizard.scss";

const INVESTOR_FIELDS = [
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
] as const;

function StepBar({
  current,
  steps,
}: {
  current: WizardStepId;
  steps: WizardStepId[];
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
            <span className="wizard-steps__label">{STEP_LABELS[s]}</span>
            {i < steps.length - 1 && <span className="wizard-steps__line" />}
          </div>
        );
      })}
    </div>
  );
}

export function OrderWizard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [levels, setLevels] = useState<Level[] | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [step, setStep] = useState<WizardStepId>(1);
  const [cadastral, setCadastral] = useState("");
  const [level, setLevel] = useState<string>(params.get("level") ?? "");
  const [investor, setInvestor] = useState<Record<string, string>>({});
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
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

  const steps = useMemo(
    () => stepsFor(step === 3 ? level : null, step),
    [step, level],
  );
  const selectedLevel = levels?.find((l) => l.id === level) ?? null;

  /* Проверка участка по кадастровому номеру (не запускает платную генерацию). */
  async function checkParcel() {
    setCheckError(null);
    setParcel(null);
    if (!isCadastral(cadastral)) {
      setCheckError(
        "Кадастровый номер должен быть в формате XX:XX:XXXXXXX:XXX.",
      );
      return;
    }
    setChecking(true);
    try {
      const res = await getParcel(cadastral);
      setParcel(res.parcel);
    } catch (err) {
      setCheckError(
        err instanceof ApiError ? err.message : "Не удалось проверить участок.",
      );
    } finally {
      setChecking(false);
    }
  }

  function goNext() {
    if (step === 4 && !offerAccepted) return;
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

  async function submit() {
    if (!offer || !parcel) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await createOrder({
        cadastral: parcel.cadastral,
        level,
        offerAccepted: true,
        offerVersion: offer.version,
        params: level === "l" ? investor : {},
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
      <StepBar current={step} steps={steps} />

      {submitError && <Alert tone="error">{submitError}</Alert>}

      <Card padded>
        {/* Шаг 1: кадастровый номер */}
        {step === 1 && (
          <div>
            <CardTitle>Кадастровый номер участка</CardTitle>
            <p className="card-sub">
              Укажите кадастровый номер в формате <b>XX:XX:XXXXXXX:XXX</b>. Мы
              проверим участок по открытым данным — платная генерация начинается
              только после оплаты.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <Input
                  value={cadastral}
                  placeholder="36:16:3405742:189"
                  onChange={(e) => setCadastral(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && checkParcel()}
                  invalid={Boolean(checkError)}
                />
                {checkError && (
                  <div className="field__error" style={{ marginTop: 6 }}>
                    {checkError}
                  </div>
                )}
              </div>
              <Button
                onClick={checkParcel}
                disabled={checking}
                icon={checking ? <Spinner /> : <IconSearch size={16} />}
              >
                Проверить
              </Button>
            </div>

            {parcel && (
              <div className="parcel-card">
                <div className="parcel-card__address">{parcel.address}</div>
                <div className="parcel-card__grid">
                  <div>
                    <b>Площадь:</b> {parcel.area}
                  </div>
                  <div>
                    <b>Кадастровая стоимость:</b> {parcel.cadastralValue}
                  </div>
                  <div>
                    <b>Категория:</b> {parcel.category}
                  </div>
                  <div>
                    <b>ВРИ:</b> {parcel.vri}
                  </div>
                </div>
                {parcel.restrictions.length > 0 && (
                  <div className="parcel-card__restrictions">
                    <b>Ограничения:</b> {parcel.restrictions.join("; ")}
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">
              <Button variant="accent" disabled={!parcel} onClick={goNext}>
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
              От уровня зависит глубина проработки, срок и цена отчёта.
            </p>
            <div className="level-select">
              {levels.map((l) => {
                const active = level === l.id;
                const meta = LEVEL_META[l.id];
                return (
                  <button
                    key={l.id}
                    type="button"
                    className={`level-select__item${active ? " is-active" : ""}${l.available === false ? " is-disabled" : ""}`}
                    onClick={() => l.available !== false && setLevel(l.id)}
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
                    {l.available === false && (
                      <div className="level-select__off">
                        Временно недоступен
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {level && (
              <div className="form-actions">
                <Button variant="ghost" onClick={goPrev}>
                  Назад
                </Button>
                <Button variant="accent" onClick={goNext}>
                  Далее <IconChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Шаг 3: инвест-параметры (только L) */}
        {step === 3 && (
          <div>
            <CardTitle>Параметры инвестиционного проекта</CardTitle>
            <p className="card-sub">
              Заполните данные, чтобы аналитики учли их при расчёте финансовой
              модели. Поля можно оставить пустыми.
            </p>
            {INVESTOR_FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <Input
                  value={investor[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) =>
                    setInvestor((prev) => ({
                      ...prev,
                      [f.key]: e.target.value,
                    }))
                  }
                />
              </Field>
            ))}
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

        {/* Шаг 4: оферта */}
        {step === 4 && (
          <div>
            <CardTitle>Публичная оферта</CardTitle>
            <p className="card-sub">
              Редакция <b>v{offer.version}</b> от {offer.updatedAt}. Для
              оформления заказа необходимо принять условия.
            </p>
            <div className="offer-doc">
              {offer.text.map((t, i) => (
                <p key={i} className="mb-0" style={{ marginBottom: 8 }}>
                  {t}
                </p>
              ))}
            </div>
            <Checkbox
              checked={offerAccepted}
              onChange={(e) => setOfferAccepted(e.target.checked)}
              label={
                <>
                  Я ознакомился и принимаю условия{" "}
                  <Link to="/documents?doc=offer" target="_blank">
                    публичной оферты
                  </Link>{" "}
                  (v{offer.version})
                </>
              }
            />
            <div className="form-actions">
              <Button variant="ghost" onClick={goPrev}>
                Назад
              </Button>
              <Button
                variant="accent"
                disabled={!offerAccepted}
                onClick={goNext}
              >
                Далее <IconChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Шаг 5: подтверждение */}
        {step === 5 && parcel && selectedLevel && (
          <div>
            <CardTitle>Подтверждение заказа</CardTitle>
            <div className="summary">
              <div className="summary__row">
                <span className="muted">Участок</span>
                <b>{parcel.cadastral}</b>
              </div>
              <div className="summary__row">
                <span className="muted">Адрес</span>
                <span>{parcel.address}</span>
              </div>
              <div className="summary__row">
                <span className="muted">Уровень</span>
                <b>{selectedLevel.name}</b>
              </div>
              <div className="summary__row">
                <span className="muted">Срок</span>
                <span>{selectedLevel.duration}</span>
              </div>
              {level === "l" &&
                Object.entries(investor)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div className="summary__row" key={k}>
                      <span className="muted">
                        {INVESTOR_FIELDS.find((f) => f.key === k)?.label}
                      </span>
                      <span>{v}</span>
                    </div>
                  ))}
              <div className="summary__row summary__row--total">
                <span>Итого</span>
                <b className="grad-text">{fmtPrice(selectedLevel.price)}</b>
              </div>
            </div>
            <Alert tone="info" title="Оплата.">
              После оформления вы перейдёте к безопасной оплате картой.
              Генерация отчёта начнётся автоматически после оплаты.
            </Alert>

            <div className="form-actions">
              <Button variant="ghost" onClick={goPrev}>
                Назад
              </Button>
              <Button variant="accent" onClick={submit} disabled={submitting}>
                {submitting ? "Создаём заказ…" : "Оформить заказ"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
