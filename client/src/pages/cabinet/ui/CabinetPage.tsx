import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { SidebarLayout } from "@/widgets/sidebar/ui/SidebarLayout";
import { OrderCard } from "@/widgets/order-card/ui/OrderCard";
import { RecentEvents } from "@/widgets/recent-events/ui/RecentEvents";
import { DownloadReportLink } from "@/features/order-actions/ui/actions";
import { getOrders, type OrderSummary } from "@/entities/order/api";
import { getDocuments, type DocumentMeta } from "@/entities/document/api";
import {
  ProfileForm,
  PasswordForm,
  DeleteRequestForm,
} from "@/features/profile/ui/profile";
import { FeedbackForm } from "@/features/feedback/ui/FeedbackForm";
import { useAuth } from "@/app/providers/auth";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Button } from "@/shared/ui/Button";
import { fmtPrice, fmtTime, initials } from "@/shared/lib/format";
import { CONTACTS } from "@/shared/config";
import {
  IconDashboard,
  IconOrders,
  IconReports,
  IconPayments,
  IconDocuments,
  IconProfile,
  IconSupport,
  IconArrowRight,
  IconFile,
  IconCheckCircle,
} from "@/shared/icons";
import "./cabinet.scss";
import "./cabinet.scss";

type TabKey =
  | "overview"
  | "orders"
  | "reports"
  | "payments"
  | "documents"
  | "profile"
  | "support";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Обзор" },
  { key: "orders", label: "Заказы" },
  { key: "reports", label: "Отчёты" },
  { key: "payments", label: "Платежи" },
  { key: "documents", label: "Документы" },
  { key: "profile", label: "Профиль" },
  { key: "support", label: "Поддержка" },
];

const TAB_ICONS: Record<TabKey, ReactNode> = {
  overview: <IconDashboard size={18} />,
  orders: <IconOrders size={18} />,
  reports: <IconReports size={18} />,
  payments: <IconPayments size={18} />,
  documents: <IconDocuments size={18} />,
  profile: <IconProfile size={18} />,
  support: <IconSupport size={18} />,
};

/** Личный кабинет: 7 разделов, переключение через ?tab= */
export function CabinetPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as TabKey | null) ?? "overview";

  const onNav = useCallback(
    (key: string) => {
      setParams({ tab: key });
    },
    [setParams],
  );

  const onNewAnalysis = useCallback(() => {
    navigate("/order");
  }, [navigate]);

  return (
    <SidebarLayout
      title={TABS.find((t) => t.key === tab)?.label ?? "Личный кабинет"}
      active={tab}
      nav={TABS.map((t) => ({
        key: t.key,
        label: t.label,
        icon: TAB_ICONS[t.key],
      }))}
      onNav={onNav}
      onNewAnalysis={onNewAnalysis}
    >
      {!user || !TABS.some((t) => t.key === tab) ? (
        <Alert tone="error">Раздел не найден.</Alert>
      ) : tab === "overview" ? (
        <CabinetOverview />
      ) : tab === "orders" ? (
        <OrdersTab />
      ) : tab === "reports" ? (
        <ReportsTab />
      ) : tab === "payments" ? (
        <PaymentsTab />
      ) : tab === "documents" ? (
        <DocumentsTab />
      ) : tab === "profile" ? (
        <ProfileTab />
      ) : (
        <SupportTab />
      )}
    </SidebarLayout>
  );
}

/* ---------- Вкладки ---------- */

function useOrders() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getOrders();
      setOrders(res.orders);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить заказы.",
      );
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { orders, error, reload: load };
}

function CabinetOverview() {
  const { user } = useAuth();
  const { orders, error } = useOrders();

  const paid =
    orders?.filter(
      (o) => o.status !== "Заказ создан" && o.status !== "Ожидает оплаты",
    ) ?? [];
  const done = orders?.filter((o) => o.status === "Готово") ?? [];
  const sum = paid.reduce((acc, o) => acc + o.price, 0);

  return (
    <div>
      <div className="cabinet-hello">
        <div className="cabinet-hello__avatar">
          {user ? initials(user.name) : "?"}
        </div>
        <div>
          <b>Здравствуйте, {user?.firstName ?? "коллега"}!</b>
          <div className="muted" style={{ fontSize: 13.5 }}>
            Рады видеть вас в «Гео Разум». Ниже — сводка по вашим заказам.
          </div>
        </div>
      </div>

      <div className="stat-grid cabinet-stats">
        <div className="stat-card">
          <div className="stat-card__label">Всего заказов</div>
          <div
            className="stat-card__value"
            style={{ color: "var(--blue-dark)" }}
          >
            {orders?.length ?? "—"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Оплачено</div>
          <div
            className="stat-card__value"
            style={{ color: "var(--green-dark)" }}
          >
            {paid.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Готовые отчёты</div>
          <div
            className="stat-card__value"
            style={{ color: "var(--green-dark)" }}
          >
            {done.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Сумма заказов</div>
          <div className="stat-card__value" style={{ color: "var(--text)" }}>
            {fmtPrice(sum)}
          </div>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!orders && (
        <div style={{ padding: "24px 0" }}>
          <Spinner /> Загружаем заказы…
        </div>
      )}
      {orders && orders.length === 0 && (
        <EmptyState
          title="Заказов пока нет"
          description="Создайте первый заказ — это займёт пару минут."
          icon={<IconFile size={36} />}
          action={
            <Link to="/order" className="btn btn--accent">
              Проверить участок
            </Link>
          }
        />
      )}

      {orders && orders.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="cabinet-section-title">
            <b>Последние заказы</b>
            <Link to="/cabinet?tab=orders" className="cabinet-link">
              Все заказы →
            </Link>
          </div>
          <div className="cabinet-orders">
            {orders.slice(0, 3).map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        </div>
      )}
      <div className="cabinet-events">
        <RecentEvents />
      </div>
    </div>
  );
}

function OrdersTab() {
  const { orders, error, reload } = useOrders();

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <b>Все заказы ({orders?.length ?? "…"})</b>
        <Link to="/order" className="btn btn--accent btn--sm">
          + Новый анализ
        </Link>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {!orders && <Spinner />}
      {orders && orders.length === 0 && (
        <EmptyState
          title="Заказов нет"
          description="Создайте заказ, чтобы получить аналитическое заключение по участку."
          action={
            <Link to="/order" className="btn btn--accent">
              Проверить участок
            </Link>
          }
        />
      )}
      <div className="cabinet-orders">
        {orders?.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
      {orders && orders.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={reload}
          style={{ marginTop: 12 }}
        >
          Обновить
        </Button>
      )}
    </div>
  );
}

function ReportsTab() {
  const { orders, error } = useOrders();
  const ready = orders?.filter((o) => o.status === "Готово") ?? [];

  return (
    <div>
      <b style={{ display: "block", marginBottom: 16 }}>
        Готовые отчёты ({ready.length})
      </b>
      {error && <Alert tone="error">{error}</Alert>}
      {!orders && <Spinner />}
      {orders && ready.length === 0 && (
        <EmptyState
          title="Готовых отчётов нет"
          description="Когда генерация завершится, отчёт появится здесь и на странице заказа."
        />
      )}
      <div className="cabinet-reports">
        {ready.map((o) => (
          <div className="cabinet-report card" key={o.id}>
            <span className="cabinet-report__icon">
              <IconCheckCircle size={20} />
            </span>
            <div className="cabinet-report__main">
              <Link to={"/order/" + o.id} className="cabinet-report__id">
                {o.id}
              </Link>
              <div className="muted" style={{ fontSize: 13 }}>
                {o.cadastral} · {o.levelName}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                Оплачен: {fmtTime(o.paidAt)}
              </div>
            </div>
            <div className="cabinet-report__actions">
              <DownloadReportLink orderId={o.id}>
                Скачать PDF
              </DownloadReportLink>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentsTab() {
  const { orders, error } = useOrders();
  const payments =
    orders?.filter(
      (o) => o.status !== "Заказ создан" && o.status !== "Ожидает оплаты",
    ) ?? [];

  return (
    <div>
      <b style={{ display: "block", marginBottom: 16 }}>Платежи по заказам</b>
      {error && <Alert tone="error">{error}</Alert>}
      {!orders && <Spinner />}
      {orders && payments.length === 0 && (
        <EmptyState
          title="Платежей нет"
          description="Оплаченные заказы появятся здесь."
        />
      )}
      {payments.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Кадастровый номер</th>
                <th>Дата оплаты</th>
                <th>Сумма</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={"/order/" + o.id}>
                      <b>{o.id}</b>
                    </Link>
                  </td>
                  <td>{o.cadastral}</td>
                  <td>{fmtTime(o.paidAt)}</td>
                  <td>
                    <b>{fmtPrice(o.price)}</b>
                  </td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DocumentsTab() {
  const [docs, setDocs] = useState<DocumentMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocuments()
      .then((res) => setDocs(res.documents))
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить документы.",
        ),
      );
  }, []);

  return (
    <div>
      <b style={{ display: "block", marginBottom: 16 }}>Документы сервиса</b>
      {error && <Alert tone="error">{error}</Alert>}
      {!docs && <Spinner />}
      <div className="cabinet-docs">
        {(docs ?? []).map((d) => (
          <Link
            key={d.id}
            to={"/documents?doc=" + d.id}
            target="_blank"
            className="cabinet-doc card"
          >
            <IconFile size={20} />
            <span>
              <b>{d.title}</b>
              <span className="muted" style={{ fontSize: 13 }}>
                от {fmtTime(d.updatedAt)}
              </span>
            </span>
            <IconArrowRight size={16} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProfileTab() {
  return (
    <div className="cabinet-profile">
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ marginTop: 0 }}>Личные данные</h3>
        <ProfileForm />
      </div>

      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ marginTop: 0 }}>Смена пароля</h3>
        <PasswordForm />
      </div>

      <div
        className="card"
        style={{ padding: 22, borderColor: "var(--border-strong)" }}
      >
        <h3 style={{ marginTop: 0, color: "var(--danger)" }}>
          Удаление аккаунта
        </h3>
        <DeleteRequestForm />
      </div>
    </div>
  );
}

function SupportTab() {
  return (
    <div className="cabinet-support">
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ marginTop: 0 }}>Обращение в поддержку</h3>
        <FeedbackForm />
      </div>
      <div className="card" style={{ padding: 22 }}>
        <h3 style={{ marginTop: 0 }}>Контакты</h3>
        <div
          className="muted"
          style={{
            fontSize: 14,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <span>
            Email: <b>{CONTACTS.email}</b>
          </span>
          <span>
            Телефон: <b>{CONTACTS.phone}</b>
          </span>
          <span>{CONTACTS.address}</span>
        </div>
        <p
          className="muted"
          style={{ fontSize: 13, marginBottom: 0, marginTop: 12 }}
        >
          Обычно отвечаем в течение рабочего дня.
        </p>
      </div>
    </div>
  );
}
