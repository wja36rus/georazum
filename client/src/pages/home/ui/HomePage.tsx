import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLevels, type Level } from "@/entities/level/api";
import { LevelCard } from "@/widgets/level-card/ui/LevelCard";
import { Faq } from "@/widgets/faq/ui/Faq";
import { Spinner } from "@/shared/ui/Spinner";
import {
  IconSearch,
  IconFile,
  IconCard,
  IconDownload,
  IconArrowRight,
  IconMail,
  IconPhone,
  IconPin,
  IconCheckCircle,
  LogoMark,
} from "@/shared/icons";
import { CONTACTS, DEMO_CADASTRALS } from "@/shared/config";
import { useAuth } from "@/app/providers/auth";
import "./home.scss";

const STEPS = [
  {
    icon: <IconSearch size={22} />,
    title: "Введите кадастровый номер",
    text: "Укажите номер участка в формате XX:XX:XXXXXXX:XXX — мы бесплатно проверим его по открытым данным.",
  },
  {
    icon: <IconFile size={22} />,
    title: "Выберите уровень анализа",
    text: "S — базовый, M — расширенный, L — инвестиционный. От уровня зависит глубина и срок отчёта.",
  },
  {
    icon: <IconCard size={22} />,
    title: "Оплатите онлайн",
    text: "Безопасная оплата картой. Генерация отчёта начнётся автоматически после поступления оплаты.",
  },
  {
    icon: <IconDownload size={22} />,
    title: "Получите PDF-отчёт",
    text: "Готовое заключение появится в личном кабинете, продублируем его на email.",
  },
];

const REPORT_INCLUDES = [
  "Правовой статус и назначение участка",
  "Возможность строительства и ВРИ",
  "Зоны с особыми условиями и ограничения",
  "Актуальная кадастровая стоимость",
  "Риски и «красные флаги» для сделки",
  "Оценка инфраструктуры и доступности",
  "Инвестиционная привлекательность (уровень L)",
  "Рекомендации и следующие шаги",
];

const ADVANTAGES = [
  {
    title: "Быстро",
    text: "Отчёт уровня S — до 4 часов. Не нужно ждать неделями ответы из инстанций.",
  },
  {
    title: "Понятно",
    text: "Структурированное заключение на русском языке с выводами по каждому разделу.",
  },
  {
    title: "Прозрачно",
    text: "Цена фиксируется до оплаты. Данные берутся из открытых источников, которые указаны в отчёте.",
  },
  {
    title: "Безопасно",
    text: "Оплата картой онлайн, отчёт — в личном кабинете и на почте. Платежи и документы защищены.",
  },
];

export function HomePage() {
  const { user } = useAuth();
  const [levels, setLevels] = useState<Level[] | null>(null);

  useEffect(() => {
    getLevels()
      .then(setLevels)
      .catch(() => setLevels([]));
  }, []);

  const target = user
    ? user.role === "admin"
      ? "/admin"
      : "/cabinet"
    : "/order";

  return (
    <div className="home">
      {/* Хиро */}
      <section className="home__hero">
        <div className="container home__hero-inner">
          <div className="home__hero-badge">
            <LogoMark size={22} />
            Аналитика участков · от 3 900 ₽
          </div>
          <h1 className="home__hero-title">
            Аналитическое заключение{" "}
            <span className="grad-text">по земельному участку</span> по
            кадастровому номеру
          </h1>
          <p className="home__hero-sub">
            Проверим участок перед покупкой, строительством или инвестициями:
            правовой статус, ограничения, риски и потенциал — в одном
            PDF-отчёте.
          </p>
          <div className="home__hero-actions">
            <Link to="/order" className="btn btn--lg btn--accent">
              Проверить участок <IconArrowRight size={18} />
            </Link>
            <Link to="/examples" className="btn btn--lg btn--ghost">
              Смотреть пример отчёта
            </Link>
          </div>
          {!user && (
            <p className="home__demo-hint muted">
              Демо-участки:{" "}
              {DEMO_CADASTRALS.map((c, i) => (
                <span key={c}>
                  <code>{c}</code>
                  {i < DEMO_CADASTRALS.length - 1 && ", "}
                </span>
              ))}
            </p>
          )}
        </div>
      </section>

      {/* Как это работает */}
      <section className="section home__how" id="how">
        <div className="container">
          <div className="section-head">
            <div className="section-kicker">Процесс</div>
            <h2>Как это работает</h2>
            <p className="page-sub" style={{ margin: "0 auto" }}>
              От кадастрового номера до готового заключения — четыре простых
              шага.
            </p>
          </div>
          <div className="grid-4 home__steps">
            {STEPS.map((s, i) => (
              <div className="home-step card" key={s.title}>
                <div className="home-step__icon">{s.icon}</div>
                <div className="home-step__num">Шаг {i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Уровни */}
      <section className="section section--alt" id="levels">
        <div className="container">
          <div className="section-head">
            <div className="section-kicker">Тарифы</div>
            <h2>Выберите уровень анализа</h2>
            <p className="page-sub" style={{ margin: "0 auto" }}>
              S — базовый, M — расширенный, L — инвестиционный. Цена фиксируется
              до оплаты.
            </p>
          </div>
          {!levels && (
            <div className="home__levels-loading">
              <Spinner /> Загружаем тарифы…
            </div>
          )}
          {levels && levels.length === 0 && (
            <p className="muted text-center">Тарифы временно недоступны.</p>
          )}
          <div className="grid-3">
            {levels?.map((l) => (
              <LevelCard
                key={l.id}
                level={l}
                accent={l.id === "s" ? "blue" : l.id === "m" ? "green" : "warn"}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Что входит в отчёт */}
      <section className="section" id="report">
        <div className="container">
          <div className="section-head">
            <div className="section-kicker">Состав отчёта</div>
            <h2>Что входит в заключение</h2>
            <p className="page-sub" style={{ margin: "0 auto" }}>
              Каждый отчёт собирается аналитиком на основе открытых данных и
              проверяется перед отправкой.
            </p>
          </div>
          <div className="grid-2 home__includes">
            {REPORT_INCLUDES.map((item) => (
              <div className="home-include" key={item}>
                <IconCheckCircle size={18} />
                {item}
              </div>
            ))}
          </div>
          <div className="text-center" style={{ marginTop: 24 }}>
            <Link to="/examples" className="btn btn--ghost">
              Посмотреть демо-отчёт <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className="section section--alt" id="advantages">
        <div className="container">
          <div className="section-head">
            <div className="section-kicker">Почему «Гео Разум»</div>
            <h2>Преимущества сервиса</h2>
          </div>
          <div className="grid-4">
            {ADVANTAGES.map((a) => (
              <div className="home-adv" key={a.title}>
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq">
        <div className="container">
          <div className="section-head">
            <div className="section-kicker">Вопросы</div>
            <h2>Частые вопросы</h2>
          </div>
          <Faq />
        </div>
      </section>

      {/* Контакты */}
      <section className="section section--alt" id="contacts">
        <div className="container">
          <div className="section-head">
            <div className="section-kicker">Контакты</div>
            <h2>Свяжитесь с нами</h2>
          </div>
          <div className="home-contacts card">
            <div className="home-contacts__item">
              <IconMail size={18} />
              <div>
                <div className="muted">Email</div>
                <b>{CONTACTS.email}</b>
              </div>
            </div>
            <div className="home-contacts__item">
              <IconPhone size={18} />
              <div>
                <div className="muted">Телефон</div>
                <b>{CONTACTS.phone}</b>
              </div>
            </div>
            <div className="home-contacts__item">
              <IconPin size={18} />
              <div>
                <div className="muted">Адрес</div>
                <b>{CONTACTS.address}</b>
              </div>
            </div>
            <div className="home-contacts__item">
              <div>
                <div className="muted">Реквизиты</div>
                <b>{CONTACTS.inn}</b>
              </div>
            </div>
          </div>
          <div className="text-center" style={{ marginTop: 20 }}>
            <Link to={target} className="btn btn--accent">
              {user ? "Перейти в личный кабинет" : "Создать заказ"}{" "}
              <IconArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
