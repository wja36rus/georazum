import { useCallback, useEffect, useState } from "react";
import { getGenerations, type GenerationJob } from "@/entities/admin/api";
import { Table, type TableColumn } from "@/shared/ui/Table";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import { StatusBadge } from "@/widgets/status-badge/ui/StatusBadge";
import { fmtTime } from "@/shared/lib/format";
import "./admin.scss";

/** Таблица задач генерации отчётов в админке. */
export function AdminGenerationsTable() {
  const [rows, setRows] = useState<GenerationJob[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getGenerations();
      setRows(res.generations);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить генерации.",
      );
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const columns: TableColumn<GenerationJob>[] = [
    { key: "id", title: "ID задачи", render: (g) => <b>{g.id}</b> },
    { key: "orderId", title: "Заказ", render: (g) => g.orderId },
    {
      key: "level",
      title: "Уровень",
      render: (g) => <b>{g.level.toUpperCase()}</b>,
    },
    { key: "attempts", title: "Попытки", render: (g) => g.attempts },
    {
      key: "status",
      title: "Статус",
      render: (g) => <StatusBadge status={g.status} />,
    },
    { key: "startedAt", title: "Старт", render: (g) => fmtTime(g.startedAt) },
    {
      key: "durationSeconds",
      title: "Длительность",
      render: (g) =>
        g.durationSeconds != null ? g.durationSeconds + " с" : "—",
    },
  ];

  return (
    <div>
      {error && <Alert tone="error">{error}</Alert>}
      {!rows && (
        <div style={{ padding: "24px 0" }}>
          <Spinner /> Загружаем генерации…
        </div>
      )}
      {rows && (
        <Table
          columns={columns}
          data={rows}
          rowKey={(g) => g.id}
          empty="Генерации не найдены."
        />
      )}
    </div>
  );
}
