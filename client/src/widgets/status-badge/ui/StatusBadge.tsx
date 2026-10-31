import { cn } from "@/shared/lib/format";
import {
  isActiveGeneration,
  isFailed,
  ORDER_STATUSES,
  statusIndex,
  type OrderStatus,
} from "@/entities/order/api";

type Tone = "gray" | "blue" | "green" | "red" | "warn";

/** Тон бейджа по статусу заказа. */
export function toneForStatus(status: string): Tone {
  if (status === "Готово") return "green";
  if (isFailed(status)) return "red";
  if (status === "Ожидает оплаты") return "warn";
  if (isActiveGeneration(status)) return "blue";
  return "gray";
}

export type StatusBadgeProps = {
  status: OrderStatus | string;
  /** Показывать ли точку-индикатор. */
  dot?: boolean;
  className?: string;
};

export function StatusBadge({ status, dot = true, className }: StatusBadgeProps) {
  const tone = toneForStatus(status);
  const idx = statusIndex(status);
  return (
    <span
      className={cn("badge", `badge-tone--${tone}`, className)}
      title={`Статус ${idx + 1} из ${ORDER_STATUSES.length}: ${status}`}
    >
      {dot && <span className="badge__dot" />}
      {status}
    </span>
  );
}
