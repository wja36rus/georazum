import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getOrder, type OrderFull } from "@/entities/order/api";
import { PayForm } from "@/features/pay/ui/PayForm";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import { Card, CardTitle } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { fmtPrice, fmtTime } from "@/shared/lib/format";
import "./pay.scss";

/** Страница оплаты заказа. */
export function PayPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const res = await getOrder(id);
      setOrder(res.order);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить заказ.",
      );
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error && !order) {
    return (
      <div className="page">
        <div className="container">
          <Alert tone="error">{error}</Alert>
          <Button variant="ghost" onClick={load}>
            Повторить
          </Button>
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

  if (order.status !== "Ожидает оплаты" && order.status !== "Заказ создан") {
    return (
      <div className="page">
        <div className="container pay-note">
          <Alert tone="info" title="Заказ уже оплачен.">
            Генерация отчёта идёт автоматически. Вы можете следить за статусом
            на странице заказа.
          </Alert>
          <Link to={"/order/" + order.id} className="btn btn--accent">
            К статусу заказа
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container pay-page">
        <div className="pay-page__info card">
          <CardTitle>Заказ {order.id}</CardTitle>
          <div className="pay-page__row">
            <span className="muted">Кадастровый номер</span>
            <b>{order.cadastral}</b>
          </div>
          <div className="pay-page__row">
            <span className="muted">Уровень</span>
            <b>{order.levelName}</b>
          </div>
          <div className="pay-page__row">
            <span className="muted">Срок подготовки</span>
            <span>—</span>
          </div>
          <div className="pay-page__row">
            <span className="muted">Создан</span>
            <span>{fmtTime(order.createdAt)}</span>
          </div>
          <div className="pay-page__total">
            <span>К оплате</span>
            <b>{fmtPrice(order.price)}</b>
          </div>
        </div>

        <Card padded className="pay-page__form">
          <CardTitle>Оплата картой</CardTitle>
          <PayForm
            order={order}
            onSuccess={() => navigate("/order/" + order.id)}
          />
        </Card>
      </div>
    </div>
  );
}
