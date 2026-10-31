import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogoFull } from "@/shared/icons";
import { useAuth } from "@/app/providers/auth";
import { Button } from "@/shared/ui/Button";
import { IconMenu, IconClose } from "@/shared/icons";
import "./header.scss";

const NAV = [
  { to: "/", label: "Главная" },
  { to: "/about", label: "О сервисе" },
  { to: "/levels", label: "Уровни" },
  { to: "/tariffs", label: "Тарифы" },
  { to: "/examples", label: "Примеры" },
  { to: "/documents", label: "Документы" },
  { to: "/contacts", label: "Контакты" },
];

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="header no-print">
      <div className="container header__inner">
        <Link to="/" onClick={() => setOpen(false)}>
          <LogoFull size={30} />
        </Link>

        <nav
          className={"header__nav" + (open ? " header__nav--open" : "")}
          aria-label="Основное меню"
        >
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                "header__link" + (isActive ? " is-active" : "")
              }
              onClick={() => setOpen(false)}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="header__actions">
          {user ? (
            <>
              <Link
                to={user.role === "admin" ? "/admin" : "/cabinet"}
                className="header__cab"
              >
                Личный кабинет
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Выйти
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="header__cab">
                Войти
              </Link>
              <Button size="sm" onClick={() => navigate("/register")}>
                Регистрация
              </Button>
            </>
          )}
        </div>

        <button
          className="header__burger"
          onClick={() => setOpen((v) => !v)}
          aria-label="Меню"
        >
          {open ? <IconClose size={22} /> : <IconMenu size={22} />}
        </button>
      </div>
    </header>
  );
}
