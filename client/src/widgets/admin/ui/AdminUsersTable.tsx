import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  getAdminUsers,
  getUserOrders,
  getUserWallet,
  topUpUserWallet,
} from "@/entities/admin/api";
import type { AdminUser } from "@/entities/user/api";
import type { WalletTx } from "@/entities/wallet/api";
import { Table, type TableColumn } from "@/shared/ui/Table";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Field } from "@/shared/ui/Field";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import { StatusBadge } from "@/widgets/status-badge/ui/StatusBadge";
import { UserBlockButton } from "@/features/admin/ui/forms";
import { fmtPrice, fmtTime } from "@/shared/lib/format";
import { IconOrders, IconWallet, IconPlus } from "@/shared/icons";
import { ApiError } from "@/shared/api/client";
import "./admin.scss";

/** Таблица пользователей админки: поиск, блокировка, просмотр заказов. */
export function AdminUsersTable() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(
    async (query = q) => {
      setError(null);
      try {
        const res = await getAdminUsers(query.trim());
        setUsers(res.users);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить пользователей.",
        );
        setUsers([]);
      }
    },
    [q],
  );

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: TableColumn<AdminUser>[] = [
    {
      key: "name",
      title: "Пользователь",
      render: (u) => (
        <div>
          <b>{u.name}</b>
          <div className="muted" style={{ fontSize: 12 }}>
            {u.email}
          </div>
        </div>
      ),
    },
    { key: "phone", title: "Телефон", render: (u) => u.phone },
    { key: "ordersCount", title: "Заказы", render: (u) => u.ordersCount },
    {
      key: "balance",
      title: "Баланс",
      render: (u) => <b>{fmtPrice(u.balance)}</b>,
    },
    {
      key: "createdAt",
      title: "Регистрация",
      render: (u) => fmtTime(u.createdAt),
    },
    {
      key: "status",
      title: "Статус",
      render: (u) =>
        u.blocked ? (
          <StatusBadge status="Требуется вмешательство специалиста" />
        ) : (
          <span className="badge badge-tone--green">Активен</span>
        ),
    },
    {
      key: "actions",
      title: "Действия",
      render: (u) => (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <UserBlockButton user={u} onChanged={() => load(q)} />
          <details className="admin-details">
            <summary className="admin-details__summary">
              <IconOrders size={15} /> Заказы
            </summary>
            <UserOrders userId={u.id} />
          </details>
          <details className="admin-details">
            <summary className="admin-details__summary">
              <IconWallet size={15} /> Счёт
            </summary>
            <UserWallet userId={u.id} onChanged={() => load(q)} />
          </details>
        </div>
      ),
    },
  ];

  return (
    <div>
      <form
        className="admin-filters"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по имени или email…"
        />
        <Button type="submit" size="sm" variant="ghost">
          Найти
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setQ("");
            load("");
          }}
        >
          Сбросить
        </Button>
      </form>

      {error && <Alert tone="error">{error}</Alert>}
      {!users && (
        <div style={{ padding: "24px 0" }}>
          <Spinner /> Загружаем пользователей…
        </div>
      )}
      {users && (
        <Table
          columns={columns}
          data={users}
          rowKey={(u) => u.id}
          empty="Пользователи не найдены."
        />
      )}
    </div>
  );
}

/** Портянка с заказами пользователя (внутри details). */
function UserOrders({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<
    Awaited<ReturnType<typeof getUserOrders>>["orders"] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserOrders(userId)
      .then((res) => setOrders(res.orders))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Ошибка загрузки."),
      );
  }, [userId]);

  if (error) return <div className="field__error">{error}</div>;
  if (!orders)
    return (
      <div>
        <Spinner />
      </div>
    );

  return (
    <div className="admin-user-orders">
      {orders.length === 0 && <div className="muted">Заказов нет.</div>}
      {orders.map((o) => (
        <div key={o.id} className="admin-user-orders__row">
          <b>{o.id}</b>
          <span className="muted">{o.cadastral}</span>
          <StatusBadge status={o.status} />
        </div>
      ))}
    </div>
  );
}

/** Счёт пользователя (внутри details): баланс, история, пополнение техподдержкой. */
function UserWallet({
  userId,
  onChanged,
}: {
  userId: string;
  onChanged: () => void;
}) {
  const [wallet, setWallet] = useState<{
    user: { balance: number };
    transactions: WalletTx[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setWallet(await getUserWallet(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки счёта.");
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value <= 0) {
      return setFormError("Укажите сумму пополнения.");
    }
    setBusy(true);
    try {
      await topUpUserWallet(userId, value);
      setSuccess("Счёт пополнен на " + fmtPrice(value) + ".");
      setAmount("");
      await load();
      onChanged();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Не удалось пополнить счёт.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="field__error">{error}</div>;
  if (!wallet)
    return (
      <div>
        <Spinner />
      </div>
    );

  return (
    <div className="admin-user-wallet">
      <div className="admin-user-wallet__balance">
        <span className="muted">Баланс</span>
        <b>{fmtPrice(wallet.user.balance)}</b>
      </div>

      <form className="admin-user-wallet__topup" onSubmit={onSubmit} noValidate>
        {success && (
          <Alert tone="success" title="Готово.">
            {success}
          </Alert>
        )}
        {formError && <Alert tone="error">{formError}</Alert>}
        <Field label="Пополнить счёт">
          <div className="admin-user-wallet__row">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              step={100}
              placeholder="Сумма, ₽"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button
              type="submit"
              size="sm"
              variant="green"
              disabled={busy}
              icon={busy ? <Spinner /> : <IconPlus size={15} />}
            >
              Пополнить
            </Button>
          </div>
        </Field>
      </form>

      <div className="admin-user-wallet__history">
        {wallet.transactions.length === 0 && (
          <div className="muted">Операций нет.</div>
        )}
        {wallet.transactions.map((t) => (
          <div key={t.id} className="admin-user-wallet__tx">
            <span className="muted" style={{ whiteSpace: "nowrap" }}>
              {fmtTime(t.createdAt)}
            </span>
            <span
              className={
                t.type === "topup"
                  ? "badge badge-tone--green"
                  : "badge badge-tone--blue"
              }
            >
              {t.type === "topup" ? "Пополнение" : "Списание"}
            </span>
            <span className="muted admin-user-wallet__desc">
              {t.description}
            </span>
            <b>
              {t.type === "topup" ? "+" : "−"}
              {t.amount.toLocaleString("ru-RU")} ₽
            </b>
            <span className="muted">{fmtPrice(t.balanceAfter)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
