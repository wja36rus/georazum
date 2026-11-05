import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getOrder, payOrder, type OrderFull } from "@/entities/order/api";
import { getWallet } from "@/entities/wallet/api";
import { PayForm } from "@/features/pay/ui/PayForm";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import { Card, CardTitle } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { IconWallet } from "@/shared/icons";
import { fmtPrice, fmtTime } from "@/shared/lib/format";
import { ApiError } from "@/shared/api/client";
import "./pay.scss";

/** Страница оплаты заказа: картой или с личного счёта. */
export function PayPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

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

  /* Баланс личного счёта для оплаты со счёта. */
  useEffect(() => {
    getWallet()
      .then((w) => setBalance(w.balance))
      .catch((err) =>
        setBalanceError(
          err instanceof Error ? err.message : "Не удалось загрузить баланс.",
        ),
      );
  }, []);

  async function onPayFromBalance() {
    if (!order) return;
    setPayError(null);
    setPayBusy(true);
    try {
      await payOrder(order.id, { fromBalance: true });
      navigate("/order/" + order.id);
    } catch (err) {
      setPayError(
        err instanceof ApiError
          ? err.message
          : "Не удалось провести оплату со счёта.",
      );
    } finally {
      setPayBusy(false);
    }
  }

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

  const canPayFromBalance = balance != null && balance >= order.price;

  return (
    <div className="page">
      <div className="container pay-page">
        <div className="pay-page__info card">
          <CardTitle>Заказ {order.id}</CardTitle>
          <div className="pay-page__row">
            <span className="muted">Кадастровый номер</span>
            <b>
              {(order.parcels && order.parcels.length > 1
                ? order.parcels.map((p) => p.cadastral)
                : [order.cadastral]
              ).join(", ")}
            </b>
          </div>
          <div className="pay-page__row">
            <span className="muted">Площадь</span>
            <b>
              {order.parcels && order.parcels.length > 0
                ? order.parcels
                    .reduce((sum, p) => sum + (p.areaSqm || 0), 0)
                    .toLocaleString("ru-RU") + " м²"
                : "—"}
            </b>
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

        <div className="pay-page__col">
          <Card padded className="pay-page__form">
            <CardTitle>Оплата картой</CardTitle>
            <PayForm
              order={order}
              onSuccess={() => navigate("/order/" + order.id)}
            />
          </Card>

          <Card padded className="pay-page__form">
            <CardTitle>Оплата со счёта</CardTitle>
            {balanceError && <Alert tone="error">{balanceError}</Alert>}
            {balance == null && !balanceError && (
              <div>
                <Spinner /> Загружаем баланс…
              </div>
            )}
            {balance != null && (
              <>
                {payError && <Alert tone="error">{payError}</Alert>}
                <div className="pay-balance">
                  <span className="muted">Текущий баланс</span>
                  <b>{fmtPrice(balance)}</b>
                </div>
                {canPayFromBalance ? (
                  <Button
                    variant="green"
                    block
                    size="lg"
                    disabled={payBusy}
                    onClick={onPayFromBalance}
                    icon={payBusy ? <Spinner /> : <IconWallet size={18} />}
                  >
                    {payBusy ? "Оплачиваем…" : "Оплатить со счёта"}
                  </Button>
                ) : (
                  <Alert tone="warn" title="Недостаточно средств.">
                    Пополните счёт в личном кабинете, чтобы оплатить заказ со
                    счёта.
                  </Alert>
                )}
                <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
                  Средства спишутся со счёта мгновенно.{" "}
                  <Link to="/cabinet?tab=wallet">Пополнить счёт</Link>
                </p>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
