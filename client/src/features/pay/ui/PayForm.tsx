import { useState, type FormEvent } from "react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Field } from "@/shared/ui/Field";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import { IconCard } from "@/shared/icons";
import { payOrder, type OrderFull } from "@/entities/order/api";
import { cardError } from "@/shared/lib/validators";
import { ApiError } from "@/shared/api/client";
import {
  formatCardNumber,
  formatCvv,
  formatExpiry,
  EMPTY_CARD,
} from "../lib/cardForm";

export type PayFormProps = {
  order: OrderFull;
  onSuccess: () => void;
};

/**
 * Форма оплаты картой. Мок-провайдер: любая валидная карта — успех,
 * 0000000000000000 — отказ (HTTP 402).
 */
export function PayForm({ order, onSuccess }: PayFormProps) {
  const [card, setCard] = useState(EMPTY_CARD);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const err = cardError(card);
    if (err) return setError(err);
    setBusy(true);
    try {
      await payOrder(order.id, { card });
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось провести оплату.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error && <Alert tone="error">{error}</Alert>}
      <Alert tone="info" title="Демо-режим.">
        Платёж не реальный. Любая валидная карта успешна; карта{" "}
        <b>0000 0000 0000 0000</b> — отказ банка.
      </Alert>

      <Field label="Номер карты">
        <Input
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4111 1111 1111 1111"
          value={card.number}
          onChange={(e) =>
            setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))
          }
        />
      </Field>
      <div className="grid-2" style={{ gap: 12 }}>
        <Field label="Срок действия">
          <Input
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="ММ/ГГ"
            value={card.expiry}
            onChange={(e) =>
              setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))
            }
          />
        </Field>
        <Field label="CVV">
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="•••"
            maxLength={3}
            value={card.cvv}
            onChange={(e) =>
              setCard((c) => ({ ...c, cvv: formatCvv(e.target.value) }))
            }
          />
        </Field>
      </div>
      <Field label="Владелец карты">
        <Input
          autoComplete="cc-name"
          placeholder="IVAN IVANOV"
          value={card.holder}
          onChange={(e) =>
            setCard((c) => ({ ...c, holder: e.target.value.toUpperCase() }))
          }
        />
      </Field>

      <div className="form-actions">
        <Button
          type="submit"
          variant="accent"
          block
          size="lg"
          disabled={busy}
          icon={busy ? <Spinner /> : <IconCard size={18} />}
        >
          {busy ? "Оплачиваем…" : "Оплатить"}
        </Button>
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
        Оплата защищена. Данные карты обрабатывает платёжный провайдер и не
        хранятся на сайте.
      </p>
    </form>
  );
}
