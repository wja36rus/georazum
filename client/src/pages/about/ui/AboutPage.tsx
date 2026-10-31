import { Link } from "react-router-dom";
import { LogoMark } from "@/shared/icons";
import { CONTACTS } from "@/shared/config";

/** Страница «О сервисе». */
export function AboutPage() {
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">О сервисе «Гео Разум»</h1>
        <p className="page-sub">
          Мы делаем сложную информацию о земельных участках понятной и доступной каждому.
        </p>

        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
            <LogoMark size={48} />
            <div>
              <b style={{ fontSize: 20 }}>Гео Разум</b>
              <div className="muted">{CONTACTS.inn}</div>
            </div>
          </div>
          <p>
            {CONTACTS.company} — аналитический сервис по земельным участкам. По кадастровому
            номеру мы собираем открытые данные из Росреестра, ЕГРН, публичной кадастровой карты,
            генеральных планов и правил землепользования и застройки, а затем превращаем их в
            структурированное заключение, которое можно взять с собой на сделку, стройку или в банк.
          </p>
          <p>
            Нас выбирают, когда важно понять: что можно строить на участке, какие на нём есть
            ограничения и обременения, объективна ли кадастровая стоимость и насколько участок
            интересен для инвестиций.
          </p>
        </div>

        <div className="grid-3" style={{ marginBottom: 24 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3>Наша миссия</h3>
            <p className="muted" style={{ marginBottom: 0, fontSize: 14.5 }}>
              Снять неопределённость перед покупкой или строительством: каждый клиент получает
              понятные ответы о своём участке за часы, а не недели.
            </p>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <h3>Как мы работаем</h3>
            <p className="muted" style={{ marginBottom: 0, fontSize: 14.5 }}>
              Собираем данные из открытых источников, проверяем вручную, оформляем отчёт и
              отправляем его в личный кабинет и на почту. Прозрачно и без скрытых платежей.
            </p>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <h3>Ответственность</h3>
            <p className="muted" style={{ marginBottom: 0, fontSize: 14.5 }}>
              Отчёты носят информационно-аналитический характер и не заменяют официальные
              выписки и заключения кадастровых инженеров.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3>Начать просто</h3>
          <p className="muted">
            Зарегистрируйтесь, введите кадастровый номер участка, выберите уровень анализа и
            оплатите. Готовый отчёт уровня S вы получите уже в течение 4 часов.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Link to="/order" className="btn btn--accent">Проверить участок</Link>
            <Link to="/levels" className="btn btn--ghost">Сравнить уровни</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
