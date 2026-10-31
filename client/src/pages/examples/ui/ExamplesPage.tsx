import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getExampleReport, type Report } from "@/entities/report/api";
import { ReportView } from "@/widgets/report-view/ui/ReportView";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { Alert } from "@/shared/ui/Alert";
import { IconDownload, IconArrowRight } from "@/shared/icons";
import "./examples.scss";

/** Страница «Примеры»: демо-отчёт уровня L. */
export function ExamplesPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getExampleReport()
      .then((res) => setReport(res.report))
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить демо-отчёт."));
  }, []);

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Примеры отчётов</h1>
        <p className="page-sub">
          Демонстрационный отчёт уровня L по реальному участку в Воронежской области.
          Фамилии и контактные данные заменены для примера.
        </p>

        <div className="examples__toolbar no-print">
          <Link to="/order" className="btn btn--accent">
            Заказать анализ <IconArrowRight size={16} />
          </Link>
          {report && (
            <Button variant="ghost" icon={<IconDownload size={16} />} onClick={() => window.print()}>
              Печать / сохранить в PDF
            </Button>
          )}
        </div>

        {error && <Alert tone="error">{error}</Alert>}
        {!report && !error && (
          <div style={{ padding: "48px 0" }}>
            <Spinner /> Загружаем пример отчёта…
          </div>
        )}
        {report && <ReportView report={report} docTitle="Демо-отчёт" />}
      </div>
    </div>
  );
}
