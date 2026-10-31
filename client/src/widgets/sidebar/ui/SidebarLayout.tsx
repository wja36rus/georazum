import { Link } from "react-router-dom";
import { LogoFull, IconQuit, IconPlus, IconChevronRight } from "@/shared/icons";
import { useAuth } from "@/app/providers/auth";
import { initials } from "@/shared/lib/format";
import type { ReactNode } from "react";
import "./sidebar.scss";

export type SidebarNavItem = {
  key: string;
  label: string;
  /** Иконка-компонент. */
  icon: ReactNode;
};

export type SidebarLayoutProps = {
  /** Заголовок текущего раздела (верх контентной области). */
  title: string;
  /** Активный пункт навигации. */
  active: string;
  /** Пункты навигации сайдбара. */
  nav: SidebarNavItem[];
  onNav: (key: string) => void;
  /** Действие по созданию нового анализа. */
  onNewAnalysis?: () => void;
  children: ReactNode;
};

/**
 * Каркас ЛК/админки по референсу: тёмный сайдбар слева, контент справа.
 */
export function SidebarLayout({ title, active, nav, onNav, onNewAnalysis, children }: SidebarLayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <Link to="/" className="sidebar__logo">
          <LogoFull invert size={30} />
        </Link>

        <div className="sidebar__user">
          <span className="sidebar__avatar">{user ? initials(user.name) : "?"}</span>
          <div className="sidebar__user-meta">
            <b>{user?.name ?? "Гость"}</b>
            <span>{user?.email}</span>
          </div>
        </div>

        {user && (
          <div className="sidebar__cta">
            <button
              type="button"
              className="btn btn--accent btn--block"
              onClick={onNewAnalysis}
            >
              <IconPlus size={18} /> Новый анализ
            </button>
          </div>
        )}

        <nav className="sidebar__nav" aria-label="Навигация кабинета">
          {nav.map((item) => (
            <button
              key={item.key}
              type="button"
              className={"sidebar__nav-item" + (item.key === active ? " is-active" : "")}
              onClick={() => onNav(item.key)}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <Link to="/" className="sidebar__footer-link">
            Вернуться на сайт <IconChevronRight size={16} />
          </Link>
          <button type="button" className="sidebar__footer-link" onClick={signOut}>
            <IconQuit size={16} /> Выйти
          </button>
        </div>
      </aside>

      <main className="dashboard__content">
        <header className="dashboard__topbar">
          <h1 className="dashboard__title">{title}</h1>
        </header>
        <div className="dashboard__body">{children}</div>
      </main>
    </div>
  );
}
