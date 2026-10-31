import { useCallback, useEffect, useState } from "react";
import { getAdminUsers, getUserOrders } from "@/entities/admin/api";
import type { AdminUser } from "@/entities/user/api";
import { Table, type TableColumn } from "@/shared/ui/Table";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import { StatusBadge } from "@/widgets/status-badge/ui/StatusBadge";
import { UserBlockButton } from "@/features/admin/ui/forms";
import { fmtTime } from "@/shared/lib/format";
import { IconOrders } from "@/shared/icons";
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
