import { Link } from "react-router-dom";
import { CONTACTS } from "@/shared/config";
import { IconMail, IconPhone, IconPin, LogoMark } from "@/shared/icons";
import { phoneHref } from "@/shared/lib/format";
import "./footer.scss";

export function Footer() {
  return (
    <footer className="footer no-print">
      <div className="container footer__grid">
        <div className="footer__col">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <LogoMark size={30} />
            <b style={{ fontSize: 17 }}>Гео Разум</b>
          </div>
          <p className="muted" style={{ fontSize: 14 }}>
            Аналитические заключения по земельным участкам по кадастровому номеру.
            Отчёты носят информационно-аналитический характер и не заменяют
            юридическое заключение.
          </p>
        </div>

        <div className="footer__col">
          <div className="footer__title">Сервис</div>
          <Link to="/levels">Уровни анализа</Link>
          <Link to="/tariffs">Тарифы</Link>
          <Link to="/examples">Примеры отчётов</Link>
          <Link to="/order">Проверить участок</Link>
        </div>

        <div className="footer__col">
          <div className="footer__title">Документы</div>
          <Link to="/documents?doc=offer">Публичная оферта</Link>
          <Link to="/documents?doc=privacy">Политика персональных данных</Link>
          <Link to="/documents?doc=refunds">Политика возврата</Link>
        </div>

        <div className="footer__col">
          <div className="footer__title">Контакты</div>
          <a href={phoneHref(CONTACTS.phone)} className="footer__contact">
            <IconPhone size={16} /> {CONTACTS.phone}
          </a>
          <a href={"mailto:" + CONTACTS.email} className="footer__contact">
            <IconMail size={16} /> {CONTACTS.email}
          </a>
          <span className="footer__contact">
            <IconPin size={16} /> {CONTACTS.address}
          </span>
          <span className="muted" style={{ fontSize: 13, marginTop: 8, display: "block" }}>
            {CONTACTS.company} · {CONTACTS.inn}
          </span>
        </div>
      </div>
      <div className="container footer__bottom">
        © {new Date().getFullYear()} {CONTACTS.company}. Все права защищены.
      </div>
    </footer>
  );
}
