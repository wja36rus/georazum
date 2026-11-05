import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  getWallet,
  topUpWallet,
  type Wallet,
  type WalletTx,
} from "@/entities/wallet/api";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Field } from "@/shared/ui/Field";
import { EmptyState } from "@/shared/ui/EmptyState";
import { IconWallet, IconCard } from "@/shared/icons";
import { fmtPrice, fmtTime } from "@/shared/lib/format";
import { cardError, type CardInput } from "@/shared/lib/validators";
import { ApiError } from "@/shared/api/client";
import {
  formatCardNumber,
  formatExpiry,
  formatCvv,
  EMPTY_CARD,
} from "@/features/pay/lib/cardForm";
import "./wallet.scss";

/* Предустановленные суммы пополнения, ₽. */
const TOPUP_PRESETS = [1000, 5000, 10000, 25000];

const MIN_TOPUP = 100;
const MAX_TOPUP = 500000;

function amountError(v: number): string {
  if (!Number.isFinite(v) || v < MIN_TOPUP)
    return "Минимальная сумма пополнения — " + MIN_TOPUP + " ₽.";
  if (v > MAX_TOPUP)
    return (
      "Максимальная сумма пополнения — " +
      MAX_TOPUP.toLocaleString("ru-RU") +
      " ₽."
    );
  return "";
}

/** Вкладка «Счёт»: баланс, пополнение картой, история операций. */
export function WalletTab() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [amount, setAmount] = useState("5000");
  const [card, setCard] = useState<CardInput>(EMPTY_CARD);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setWallet(await getWallet());
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Не удалось загрузить счёт.",
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const value = Math.round(Number(amount));
    const err = amountError(value);
    if (err) return setFormError(err);

    const cardErr = cardError(card);
    if (cardErr) return setFormError(cardErr);

    setBusy(true);
    try {
      await topUpWallet(value, card);
      setSuccess("Счёт пополнен на " + fmtPrice(value) + ".");
      setCard(EMPTY_CARD);
      setAmount("5000");
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Не удалось пополнить счёт. Попробуйте ещё раз.",
      );
    } finally {
      setBusy(false);
    }
  }

  const balance = wallet?.balance;
  const transactions: WalletTx[] = wallet?.transactions ?? [];

  return (
    <div className="wallet">
      <div className="wallet-grid">
        <div className="wallet-balance card">
          <span className="wallet-balance__icon">
            <IconWallet size={22} />
          </span>
          <div className="wallet-balance__main">
            <div className="wallet-balance__label">Текущий баланс</div>
            <div className="wallet-balance__value">
              {balance == null ? "—" : fmtPrice(balance)}
            </div>
            <div className="wallet-balance__hint">
              Средства списываются со счёта при оплате заказа.
            </div>
          </div>
        </div>

        <div className="card wallet-topup">
          <h3 className="wallet-topup__title">Пополнение счёта</h3>
          <form onSubmit={onSubmit} noValidate>
            {success && (
              <Alert tone="success" title="Готово.">
                {success}
              </Alert>
            )}
            {formError && <Alert tone="error">{formError}</Alert>}

            <Field label="Сумма пополнения">
              <Input
                type="number"
                inputMode="numeric"
                min={MIN_TOPUP}
                step={100}
                placeholder="Например, 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <div className="wallet-presets">
              {TOPUP_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={
                    "wallet-preset" +
                    (String(p) === amount ? " wallet-preset--active" : "")
                  }
                  onClick={() => setAmount(String(p))}
                >
                  {p.toLocaleString("ru-RU")} ₽
                </button>
              ))}
            </div>

            <div className="wallet-topup__card">
              <Field label="Номер карты">
                <Input
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4111 1111 1111 1111"
                  value={card.number}
                  onChange={(e) =>
                    setCard((c) => ({
                      ...c,
                      number: formatCardNumber(e.target.value),
                    }))
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
                      setCard((c) => ({
                        ...c,
                        expiry: formatExpiry(e.target.value),
                      }))
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
                      setCard((c) => ({
                        ...c,
                        cvv: formatCvv(e.target.value),
                      }))
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
                    setCard((c) => ({
                      ...c,
                      holder: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </Field>
            </div>

            <div className="form-actions">
              <Button
                type="submit"
                variant="accent"
                block
                size="lg"
                disabled={busy}
                icon={busy ? <Spinner /> : <IconCard size={18} />}
              >
                {busy ? "Пополняем…" : "Пополнить"}
              </Button>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
              Демо-режим: любая валидная карта успешна, карта{" "}
              <b>0000 0000 0000 0000</b> — отказ банка.
            </p>
          </form>
        </div>
      </div>

      <div className="wallet-history">
        <div className="cabinet-section-title">
          <b>История операций</b>
        </div>
        {loadError && <Alert tone="error">{loadError}</Alert>}
        {!wallet && (
          <div style={{ padding: "24px 0" }}>
            <Spinner /> Загружаем счёт…
          </div>
        )}
        {wallet && transactions.length === 0 && (
          <EmptyState
            title="Операций пока нет"
            description="Пополните счёт или оплатите заказ — операции появятся здесь."
            icon={<IconWallet size={32} />}
          />
        )}
        {transactions.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Операция</th>
                  <th>Описание</th>
                  <th>Сумма</th>
                  <th>Остаток</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>
                      {fmtTime(t.createdAt)}
                    </td>
                    <td>
                      {t.type === "topup" ? (
                        <span className="badge badge-tone--green">
                          Пополнение
                        </span>
                      ) : (
                        <span className="badge badge-tone--blue">Списание</span>
                      )}
                    </td>
                    <td>
                      {t.orderId ? (
                        <Link to={"/order/" + t.orderId}>{t.description}</Link>
                      ) : (
                        t.description
                      )}
                    </td>
                    <td>
                      <b
                        className={
                          t.type === "topup"
                            ? "wallet-amount wallet-amount--plus"
                            : "wallet-amount wallet-amount--minus"
                        }
                      >
                        {t.type === "topup" ? "+" : "−"}
                        {t.amount.toLocaleString("ru-RU")} ₽
                      </b>
                    </td>
                    <td>{fmtPrice(t.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
