import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getOrder, type OrderFull } from "@/entities/order/api";
import {
  isActiveGeneration,
  isFailed,
  ORDER_STATUSES,
  statusIndex,
} from "@/entities/order/api";
import { StatusBadge } from "@/widgets/status-badge/ui/StatusBadge";
import { RetryButton, ResendButton, DownloadReportLink } from "@/features/order-actions/ui/actions";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import { Card, CardTitle } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { fmtPrice, fmtTime } from "@/shared/lib/format";
import { IconArrowRight } from "@/shared/icons";
import "./order-status.scss";

const POLL_MS = 2000;

/** Страница статуса заказа (поллинг статуса каждые 2 с во время генерации). */
export function OrderStatusPage() {
  const { id = "" } = useParams();
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await getOrder(id);
      setOrder(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить заказ.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* Поллинг, пока идёт активная генерация (включая только что оплаченные). */
  useEffect(() => {
    if (order && isActiveGeneration(order.status)) {
      timerRef.current = setTimeout(() => {
        load();
      }, POLL_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, order?.generationAttempts]);

  if (error && !order) {
    return (
      <div className="page">
        <div className="container">
          <Alert tone="error">{error}</Alert>
          <Button variant="ghost" onClick={load}>Повторить</Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page">
        <div className="container">
          <Spinner /> Загружаем заказ…
        </div>
      </div>
    );
  }

  const idx = statusIndex(order.status);
  const done = order.status === "Готово";
  const failed = isFailed(order.status);
  const awaiting = order.status === "Ожидает оплаты";

  return (
    <div className="page">
      <div className="container order-status">
        <div className="order-status__head">
          <div>
            <h1 className="page-title mb-0">Заказ {order.id}</h1>
            <div className="muted" style={{ fontSize: 14 }}>
              Создан {fmtTime(order.createdAt)} · {fmtPrice(order.price)}
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        {awaiting && (
          <Alert tone="info" title="Заказ ожидает оплаты.">
            <Link to={"/order/" + order.id + "/pay"} className="btn btn--accent btn--sm" style={{ marginTop: 8 }}>
              Перейти к оплате <IconArrowRight size={14} />
            </Link>
          </Alert>
        )}

        {failed && (
          <Alert tone="error" title="Генерация не завершилась.">
            Можно запустить генерацию повторно — статус обновится автоматически.
          </Alert>
        )}

        {done && (
          <Alert tone="success" title="Отчёт готов.">
            Скачайте PDF или откройте онлайн-версию. Также мы отправили отчёт на вашу почту.
          </Alert>
        )}

        <div className="grid-2 order-status__cols">
          <Card padded>
            <CardTitle>Детали заказа</CardTitle>
            <dl className="order-status__dl">
              <div>
                <dt>Кадастровый номер</dt>
                <dd>{order.cadastral}</dd>
              </div>
              <div>
                <dt>Адрес</dt>
                <dd>{order.parcel.address}</dd>
              </div>
              <div>
                <dt>Уровень</dt>
                <dd>{order.levelName}</dd>
              </div>
              <div>
                <dt>Стоимость</dt>
                <dd>{fmtPrice(order.price)}</dd>
              </div>
              {order.transactionId && (
                <div>
                  <dt>Транзакция</dt>
                  <dd className="nowrap">{order.transactionId}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card padded>
            <CardTitle>Статус генерации</CardTitle>
            <div className="progress-bar">
              {ORDER_STATUSES.map((s) => {
                const i = ORDER_STATUSES.indexOf(s);
                const passed = i <= idx;
                const isCurrent = i === idx;
                return (
                  <span
                    key={s}
                    title={s}
                    className={
                      "progress-bar__seg" +
                      (passed ? " is-passed" : "") +
                      (isCurrent ? " is-current" : "")
                    }
                  />
                );
              })}
            </div>
            <div className="order-status__progress-label">
              {idx + 1} из {ORDER_STATUSES.length} · {order.status}
            </div>
            <div className="order-status__actions">
              {awaiting && (
                <Link to={"/order/" + order.id + "/pay"}>Оплатить</Link>
              )}
              {failed && <RetryButton order={order} onRetried={load} />}
            </div>
          </Card>
        </div>

        <Card padded style={{ marginTop: 20 }}>
          <CardTitle>История статусов</CardTitle>
          <div className="timeline">
            {order.statusHistory.map((h, i) => (
              <div
                key={i}
                className={
                  "timeline__step" +
                  (i === order.statusHistory.length - 1 ? " timeline__step--done" : "") +
                  (i === order.statusHistory.length - 1 && isActiveGeneration(order.status) ? " timeline__step--current" : "") +
                  (isFailed(h.status) ? " timeline__step--error" : "")
                }
              >
                {h.status}
                <span className="timeline__at">{fmtTime(h.at)}</span>
              </div>
            ))}
          </div>
        </Card>

        {done && (
          <div className="order-status__final no-print">
            <DownloadReportLink orderId={order.id} />
            <ResendButton order={order} />
          </div>
        )}
      </div>
    </div>
  );
}
