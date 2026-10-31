import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getNotifications,
  markNotificationsRead,
  type Notification,
} from "@/entities/notification/api";
import { Spinner } from "@/shared/ui/Spinner";
import { Alert } from "@/shared/ui/Alert";
import { IconBell, IconCheckCircle } from "@/shared/icons";
import { fmtTime } from "@/shared/lib/format";
import "./recent-events.scss";

function notificationIcon(type: Notification["type"]) {
  switch (type) {
    case "payment":
      return <IconCheckCircle size={16} />;
    default:
      return <IconBell size={16} />;
  }
}

/** Правая колонка «Недавние события» в обзоре ЛК. */
export function RecentEvents() {
  const [events, setEvents] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getNotifications();
      setEvents(res.notifications);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить события.",
      );
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAllRead() {
    try {
      await markNotificationsRead();
      setEvents((prev) => prev?.map((e) => ({ ...e, read: true })) ?? []);
    } catch {
      /* не критично */
    }
  }

  const unread = events?.filter((e) => !e.read).length ?? 0;

  return (
    <div className="recent-events card">
      <div className="recent-events__head">
        <b>Недавние события</b>
        {unread > 0 && (
          <button
            type="button"
            className="recent-events__mark"
            onClick={markAllRead}
          >
            Отметить прочитанными
          </button>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!events && (
        <div style={{ padding: "16px 0" }}>
          <Spinner /> Загружаем события…
        </div>
      )}

      <div className="recent-events__list">
        {events?.slice(0, 5).map((e) => (
          <div
            key={e.id}
            className={"recent-events__item" + (e.read ? "" : " is-unread")}
          >
            <span className="recent-events__icon">
              {notificationIcon(e.type)}
            </span>
            <div className="recent-events__body">
              <div className="recent-events__text">{e.text}</div>
              <div className="recent-events__at">{fmtTime(e.createdAt)}</div>
            </div>
            {!e.read && <span className="recent-events__dot" />}
          </div>
        ))}
        {events?.length === 0 && (
          <div className="muted" style={{ fontSize: 14 }}>
            Событий пока нет.
          </div>
        )}
      </div>

      <div className="recent-events__foot">
        <Link to="/cabinet?tab=overview" className="recent-events__all">
          Посмотреть все события →
        </Link>
      </div>
    </div>
  );
}
