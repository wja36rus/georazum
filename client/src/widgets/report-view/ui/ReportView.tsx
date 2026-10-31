import type { Report } from "@/entities/report/api";
import { fmtPrice } from "@/shared/lib/format";
import { LogoMark } from "@/shared/icons";
import "./report-view.scss";

export type ReportViewProps = {
  report: Report;
  /** Заголовок документа (для демо — «Демо-отчёт»). */
  docTitle?: string;
};

/** Документная вёрстка отчёта для экрана и печати. */
export function ReportView({ report, docTitle }: ReportViewProps) {
  return (
    <article className="report-doc print-area">
      <header className="report-doc__header">
        <div className="report-doc__brand">
          <LogoMark size={38} />
          <div>
            <b>Гео Разум</b>
            <span>аналитическое заключение по земельному участку</span>
          </div>
        </div>
        <div className="report-doc__id">
          {docTitle ?? "Отчёт"} · {report.id}
          <div className="muted" style={{ fontSize: 12 }}>Сформирован: {report.generatedAt}</div>
        </div>
      </header>

      <h1 className="report-doc__title">{report.title}</h1>

      <div className="report-doc__summary">
        <div>
          <span>Кадастровый номер</span>
          <b>{report.cadastral}</b>
        </div>
        <div>
          <span>Адрес</span>
          <b>{report.summary.address}</b>
        </div>
        <div>
          <span>Площадь</span>
          <b>{report.summary.area}</b>
        </div>
        <div>
          <span>Уровень анализа</span>
          <b>{report.summary.level}</b>
        </div>
        <div>
          <span>Оценочная стоимость</span>
          <b>{fmtPrice(report.summary.price)}</b>
        </div>
      </div>

      {report.sections.map((s) => (
        <section key={s.title} className="report-doc__section">
          <h2>{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      ))}

      <footer className="report-doc__footer">
        <p>
          Отчёт носит информационно-аналитический характер, подготовлен на основе открытых
          источников и не заменяет официальные документы (выписку из ЕГРН, заключение
          кадастрового инженера, юридическое заключение).
        </p>
        <p>© {new Date().getFullYear()} ООО «Гео Разум». Дата формирования: {report.generatedAt}</p>
      </footer>
    </article>
  );
}
