import { useCallback, useEffect, useState } from "react";
import { getAdminStats, type AdminStats } from "@/entities/admin/api";
import { StatCard } from "@/shared/ui/StatCard";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { Alert } from "@/shared/ui/Alert";
import { fmtPrice } from "@/shared/lib/format";
import "./admin.scss";

const LEVEL_LABELS: Record<string, string> = {
  s: "Уровень S",
  m: "Уровень M",
  l: "Уровень L",
};

const LEVEL_COLORS: Record<string, string> = {
  s: "var(--blue)",
  m: "var(--green)",
  l: "var(--warn)",
};

/** Блок из девяти карточек статистики админки. */
export function AdminStatsBlocks() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await getAdminStats();
      setStats(res.stats);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить статистику.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!stats) {
    return (
      <div>
        {error && <Alert tone="error">{error}</Alert>}
        {busy && (
          <div style={{ padding: "24px 0" }}>
            <Spinner /> Загружаем статистику…
          </div>
        )}
        {error && !busy && <Button onClick={load}>Повторить</Button>}
      </div>
    );
  }

  const total = stats.byLevel.s + stats.byLevel.m + stats.byLevel.l || 1;

  return (
    <div>
      <div className="stat-grid">
        <StatCard label="Пользователи" value={stats.users} tone="blue" />
        <StatCard label="Заказы" value={stats.orders} tone="blue" />
        <StatCard
          label="Выручка"
          value={fmtPrice(stats.paidSum)}
          tone="green"
        />
        <StatCard label="Завершено" value={stats.completed} tone="green" />
        <StatCard label="Ошибки генерации" value={stats.errors} tone="red" />
        <StatCard
          label="Среднее время ген."
          value={
            stats.avgGenerationSeconds ? stats.avgGenerationSeconds + " с" : "—"
          }
          tone="warn"
        />
        <StatCard
          label="Активные генерации"
          value={stats.activeGenerations}
          tone="blue"
        />
        <StatCard
          label="Конверсия"
          value={stats.conversion != null ? stats.conversion + "%" : "—"}
          tone="gray"
        />
        <StatCard
          label="Заказы (всего уровней)"
          value={stats.orders}
          tone="gray"
        />
      </div>

      <div className="card" style={{ padding: "16px 18px" }}>
        <b style={{ marginBottom: 12, display: "block" }}>
          Распределение заказов по уровням
        </b>
        {(["s", "m", "l"] as const).map((id) => {
          const count = stats.byLevel[id];
          return (
            <div className="bar-row" key={id}>
              <span className="bar-row__label">{LEVEL_LABELS[id]}</span>
              <span className="bar-row__track">
                <span
                  className="bar-row__fill"
                  style={{
                    width: Math.round((count / total) * 100) + "%",
                    background: LEVEL_COLORS[id],
                  }}
                />
              </span>
              <b style={{ minWidth: 60, textAlign: "right" }}>{count}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}
