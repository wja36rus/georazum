import { useCallback, useEffect, useState } from "react";
import { getAdminOrders, type AdminOrder } from "@/entities/admin/api";
import { Table, type TableColumn } from "@/shared/ui/Table";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import { StatusBadge } from "@/widgets/status-badge/ui/StatusBadge";
import { OrderStatusForm } from "@/features/admin/ui/forms";
import { ORDER_STATUSES } from "@/entities/order/api";
import { fmtPrice, fmtTime } from "@/shared/lib/format";
import { LEVEL_META } from "@/features/order-wizard/lib/stepper";
import "./admin.scss";

/** Таблица заказов админки: поиск, фильтры по уровню/статусу, смена статуса. */
export function AdminOrdersTable() {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getAdminOrders({
        q: q.trim() || undefined,
        level: level || undefined,
        status: status || undefined,
      });
      setOrders(res.orders);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить заказы.",
      );
      setOrders([]);
    }
  }, [q, level, status]);

  useEffect(() => {
    load();
  }, [load]);

  const statusOptions = [
    { value: "", label: "Все статусы" },
    ...ORDER_STATUSES.map((s) => ({ value: s, label: s })),
  ];
  const levelOptions = [
    { value: "", label: "Все уровни" },
    { value: "s", label: "S" },
    { value: "m", label: "M" },
    { value: "l", label: "L" },
  ];

  const columns: TableColumn<AdminOrder>[] = [
    {
      key: "id",
      title: "Заказ",
      render: (o) => (
        <div>
          <b>{o.id}</b>
          <div className="muted" style={{ fontSize: 12 }}>
            {fmtTime(o.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: "cadastral",
      title: "Кадастровый номер",
      render: (o) => o.cadastral,
    },
    {
      key: "user",
      title: "Пользователь",
      render: (o) => (
        <div>
          <div>{o.userName}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {o.userEmail}
          </div>
        </div>
      ),
    },
    {
      key: "level",
      title: "Уровень",
      render: (o) => {
        const meta = LEVEL_META[o.level] ?? LEVEL_META.s;
        return <b style={{ color: meta.color }}>{meta.short}</b>;
      },
    },
    { key: "price", title: "Цена", render: (o) => fmtPrice(o.price) },
    {
      key: "status",
      title: "Статус",
      render: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: "actions",
      title: "Управление",
      render: (o) => <OrderStatusForm order={o} onSaved={load} />,
    },
    {
      key: "history",
      title: "История",
      render: (o) => (
        <details className="admin-details">
          <summary className="admin-details__summary">Показать</summary>
          <div className="timeline" style={{ margin: "8px 0 0" }}>
            {o.statusHistory.map((h, i) => (
              <div
                key={i}
                className={
                  "timeline__step" +
                  (i === o.statusHistory.length - 1
                    ? " timeline__step--done"
                    : "")
                }
              >
                {h.status}
                <span className="timeline__at">{fmtTime(h.at)}</span>
              </div>
            ))}
          </div>
        </details>
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
          placeholder="Поиск: № заказа, кадастровый, email…"
        />
        <Select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          options={levelOptions}
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
          }}
          options={statusOptions}
        />
        <Button type="submit" size="sm" variant="ghost">
          Применить
        </Button>
      </form>

      {error && <Alert tone="error">{error}</Alert>}
      {!orders && (
        <div style={{ padding: "24px 0" }}>
          <Spinner /> Загружаем заказы…
        </div>
      )}
      {orders && (
        <Table
          columns={columns}
          data={orders}
          rowKey={(o) => o.id}
          empty="Заказы не найдены."
        />
      )}
    </div>
  );
}
