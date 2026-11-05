import { Link } from "react-router-dom";
import type { OrderSummary } from "@/entities/order/api";
import { StatusBadge } from "@/widgets/status-badge/ui/StatusBadge";
import { fmtPrice, fmtTime } from "@/shared/lib/format";
import { LEVEL_META } from "@/features/order-wizard/lib/stepper";
import { DownloadReportLink } from "@/features/order-actions/ui/actions";
import "./order-card.scss";

export type OrderCardProps = {
  order: OrderSummary;
};

/** Карточка заказа в личном кабинете. */
export function OrderCard({ order }: OrderCardProps) {
  const meta = LEVEL_META[order.level] ?? LEVEL_META.s;

  return (
    <article className="order-card card">
      <span
        className="order-card__level"
        style={{ color: meta.color, borderColor: meta.color }}
        title={"Уровень " + meta.short}
      >
        {meta.short}
      </span>

      <div className="order-card__main">
        <div className="order-card__head">
          <Link to={"/order/" + order.id} className="order-card__id">
            {order.id}
          </Link>
          <StatusBadge status={order.status} />
        </div>
        <div className="order-card__grid">
          <span>
            <b>Кадастровый:</b> {order.cadastral}
            {order.parcelCount && order.parcelCount > 1
              ? ` +${order.parcelCount - 1}`
              : ""}
          </span>
          <span>
            <b>Уровень:</b> {order.levelName}
          </span>
          <span>
            <b>Создан:</b> {fmtTime(order.createdAt)}
          </span>
          <span>
            <b>Стоимость:</b> {fmtPrice(order.price)}
          </span>
        </div>
      </div>

      <div className="order-card__actions">
        <Link to={"/order/" + order.id} className="btn btn--ghost btn--sm">
          Открыть
        </Link>
        {order.status === "Ожидает оплаты" && (
          <Link
            to={"/order/" + order.id + "/pay"}
            className="btn btn--accent btn--sm"
          >
            Оплатить
          </Link>
        )}
        {order.status === "Готово" && order.reportId && (
          <DownloadReportLink orderId={order.id} />
        )}
      </div>
    </article>
  );
}
