import { CONTACTS } from "@/shared/config";
import { FeedbackForm } from "@/features/feedback/ui/FeedbackForm";
import { IconMail, IconPhone, IconPin, LogoMark } from "@/shared/icons";
import { phoneHref } from "@/shared/lib/format";
import "./contacts.scss";

/** Страница «Контакты» с формой обратной связи. */
export function ContactsPage() {
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Контакты</h1>
        <p className="page-sub">
          Ответим на вопросы о сервисе, отчётах и оплате. Обычно отвечаем в течение рабочего дня.
        </p>

        <div className="contacts-grid">
          <div className="contacts-info">
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <LogoMark size={40} />
                <div>
                  <b style={{ fontSize: 18 }}>{CONTACTS.company}</b>
                  <div className="muted" style={{ fontSize: 13 }}>{CONTACTS.inn}</div>
                </div>
              </div>

              <div className="contacts-info__row">
                <IconMail size={18} />
                <div>
                  <div className="muted">Email</div>
                  <a href={"mailto:" + CONTACTS.email}>{CONTACTS.email}</a>
                </div>
              </div>
              <div className="contacts-info__row">
                <IconPhone size={18} />
                <div>
                  <div className="muted">Телефон</div>
                  <a href={phoneHref(CONTACTS.phone)}>{CONTACTS.phone}</a>
                </div>
              </div>
              <div className="contacts-info__row">
                <IconPin size={18} />
                <div>
                  <div className="muted">Адрес</div>
                  <span>{CONTACTS.address}</span>
                </div>
              </div>

              <div className="contacts-info__note muted" style={{ fontSize: 13, marginTop: 16 }}>
                Режим работы: пн–пт, 9:00–18:00 (МСК).
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ marginTop: 0 }}>Написать нам</h3>
            <FeedbackForm />
          </div>
        </div>
      </div>
    </div>
  );
}
