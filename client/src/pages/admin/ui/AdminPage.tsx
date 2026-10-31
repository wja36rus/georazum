import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SidebarLayout } from "@/widgets/sidebar/ui/SidebarLayout";
import { AdminStatsBlocks } from "@/widgets/admin/ui/AdminStatsBlocks";
import { AdminOrdersTable } from "@/widgets/admin/ui/AdminOrdersTable";
import { AdminUsersTable } from "@/widgets/admin/ui/AdminUsersTable";
import { AdminGenerationsTable } from "@/widgets/admin/ui/AdminGenerationsTable";
import { LevelForm } from "@/features/admin/ui/forms";
import { OfferForm } from "@/features/admin/ui/forms";
import { getLevels, type Level } from "@/entities/level/api";
import { getOffer, type Offer } from "@/entities/offer/api";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import {
  IconStats,
  IconOrders,
  IconUsers,
  IconSettings,
  IconGenerations,
  IconOffer,
} from "@/shared/icons";
import "./admin.scss";
import "./admin.scss";

type AdminTabKey =
  "overview" | "orders" | "users" | "tariffs" | "generations" | "offer";

const TABS: { key: AdminTabKey; label: string }[] = [
  { key: "overview", label: "Статистика" },
  { key: "orders", label: "Заказы" },
  { key: "users", label: "Пользователи" },
  { key: "tariffs", label: "Тарифы" },
  { key: "generations", label: "Генерации" },
  { key: "offer", label: "Оферта" },
];

const TAB_ICONS: Record<AdminTabKey, ReactNode> = {
  overview: <IconStats size={18} />,
  orders: <IconOrders size={18} />,
  users: <IconUsers size={18} />,
  tariffs: <IconSettings size={18} />,
  generations: <IconGenerations size={18} />,
  offer: <IconOffer size={18} />,
};

/** Админ-панель: 6 разделов, переключение через ?tab= */
export function AdminPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as AdminTabKey | null) ?? "overview";

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
      title={TABS.find((t) => t.key === tab)?.label ?? "Администрирование"}
      active={tab}
      nav={TABS.map((t) => ({
        key: t.key,
        label: t.label,
        icon: TAB_ICONS[t.key],
      }))}
      onNav={onNav}
      onNewAnalysis={onNewAnalysis}
    >
      {!TABS.some((t) => t.key === tab) ? (
        <Alert tone="error">Раздел не найден.</Alert>
      ) : tab === "overview" ? (
        <AdminStatsBlocks />
      ) : tab === "orders" ? (
        <AdminOrdersTable />
      ) : tab === "users" ? (
        <AdminUsersTable />
      ) : tab === "tariffs" ? (
        <TariffsAdmin />
      ) : tab === "generations" ? (
        <AdminGenerationsTable />
      ) : (
        <OfferAdmin />
      )}
    </SidebarLayout>
  );
}

function TariffsAdmin() {
  const [levels, setLevels] = useState<Level[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setLevels(await getLevels(true));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить тарифы.",
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!levels) return <Spinner />;

  return (
    <div>
      <b style={{ display: "block", marginBottom: 16 }}>
        Редактирование тарифов
      </b>
      <div className="admin-levels">
        {levels.map((l) => (
          <div className="card" style={{ padding: 20 }} key={l.id}>
            <LevelForm level={l} onSaved={load} />
          </div>
        ))}
      </div>
    </div>
  );
}

function OfferAdmin() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getOffer();
      setOffer(res.offer);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить оферту.",
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!offer) return <Spinner />;

  return (
    <div>
      <b style={{ display: "block", marginBottom: 8 }}>
        Редактор публичной оферты
      </b>
      <p className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>
        Текущая редакция: v{offer.version} от {offer.updatedAt}. Изменения
        применяются к новым заказам.
      </p>
      <div className="card" style={{ padding: 20, maxWidth: 720 }}>
        <OfferForm version={offer.version} text={offer.text} onSaved={load} />
      </div>
    </div>
  );
}
