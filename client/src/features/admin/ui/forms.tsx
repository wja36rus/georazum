import { useState, type FormEvent } from "react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { Field } from "@/shared/ui/Field";
import { Checkbox } from "@/shared/ui/Checkbox";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Alert } from "@/shared/ui/Alert";
import { updateLevel, setOrderStatus, blockUser, updateOffer } from "@/entities/admin/api";
import type { Level } from "@/entities/level/api";
import type { OrderStatus, OrderSummary } from "@/entities/order/api";
import type { OrderFull } from "@/entities/order/api";
import type { User } from "@/entities/user/api";
import { ORDER_STATUSES } from "@/entities/order/api";
import { ApiError } from "@/shared/api/client";

function useSubmitState() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  return { error, done, setError, setDone };
}

/** Редактирование тарифа уровня (п. 11.3 ТЗ). */
export function LevelForm({ level, onSaved }: { level: Level; onSaved: () => void }) {
  const [price, setPrice] = useState(String(level.price));
  const [duration, setDuration] = useState(level.duration);
  const [tagline, setTagline] = useState(level.tagline);
  const [available, setAvailable] = useState(level.available !== false);
  const { error, done, setError, setDone } = useSubmitState();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0) return setError("Стоимость должна быть положительным числом.");
    setBusy(true);
    try {
      await updateLevel(level.id, { price: Math.floor(p), duration: duration.trim(), tagline: tagline.trim(), available });
      setDone("Тариф сохранён. Оплаченные заказы не изменятся.");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить тариф.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="level-form">
      <div className="level-form__head">
        <b>{level.name}</b>
        <Checkbox checked={available} onChange={(e) => setAvailable(e.target.checked)} label="Доступен к заказу" />
      </div>
      {done && <Alert tone="success">{done}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid-3" style={{ gap: 10 }}>
        <Field label="Цена, ₽">
          <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Срок">
          <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>
        <Field label="Краткое описание">
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </Field>
      </div>
      <div className="form-actions">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить"}</Button>
      </div>
    </form>
  );
}

/** Смена статуса заказа админом (п. 11.2 ТЗ). */
export function OrderStatusForm({ order, onSaved }: { order: OrderFull | OrderSummary; onSaved: () => void }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const { error, setError } = useSubmitState();
  const [busy, setBusy] = useState(false);

  const options: SelectOption[] = ORDER_STATUSES.map((s) => ({ value: s, label: s }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await setOrderStatus(order.id, status);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось изменить статус.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="inline-form">
      {error && <Alert tone="error">{error}</Alert>}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Select options={options} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} />
        <Button type="submit" size="sm" variant="ghost" disabled={busy || status === order.status}>Применить</Button>
      </div>
    </form>
  );
}

/** Блокировка/разблокировка пользователя. */
export function UserBlockButton({ user, onChanged }: { user: User; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setBusy(true);
    try {
      await blockUser(user.id, !user.blocked);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось изменить статус.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error && <div className="field__error">{error}</div>}
      <Button size="sm" variant={user.blocked ? "green" : "outline-danger"} onClick={toggle} disabled={busy}>
        {user.blocked ? "Разблокировать" : "Заблокировать"}
      </Button>
    </>
  );
}

/** Редактор оферты (п. 11.4 ТЗ). */
export function OfferForm({ version, text, onSaved }: { version: string; text: string[]; onSaved: () => void }) {
  const [v, setV] = useState(version);
  const [t, setT] = useState(text.join("\n"));
  const { error, done, setError, setDone } = useSubmitState();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (!v.trim()) return setError("Укажите версию оферты.");
    setBusy(true);
    try {
      await updateOffer(v.trim(), t.split(/\r?\n/).filter((x) => x.trim()));
      setDone("Оферта опубликована. Новые заказы потребуют акцепта редакции v" + v.trim() + ".");
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить оферту.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {done && <Alert tone="success">{done}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <Field label="Версия">
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="2.0" style={{ maxWidth: 160 }} />
      </Field>
      <Field label="Текст оферты" hint="Каждая строка — отдельный пункт">
        <Textarea value={t} onChange={(e) => setT(e.target.value)} style={{ minHeight: 260 }} />
      </Field>
      <div className="form-actions">
        <Button type="submit" disabled={busy}>{busy ? "Публикуем…" : "Опубликовать редакцию"}</Button>
      </div>
    </form>
  );
}
