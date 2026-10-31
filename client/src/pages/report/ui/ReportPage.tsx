import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getReport, type Report } from "@/entities/report/api";
import { ReportView } from "@/widgets/report-view/ui/ReportView";
import { Alert } from "@/shared/ui/Alert";
import { Spinner } from "@/shared/ui/Spinner";
import { Button } from "@/shared/ui/Button";
import { IconDownload, IconArrowRight } from "@/shared/icons";
import { useAuth } from "@/app/providers/auth";
import "./report.scss";

/** Страница отчёта заказа (открывается в новой вкладке, печатается в PDF). */
export function ReportPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReport(id)
      .then((res) => setReport(res.report))
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить отчёт."));
  }, [id]);

  return (
    <div className="report-page">
      <div className="report-page__toolbar no-print">
        {user && (
          <Link to="/cabinet?tab=reports" className="btn btn--ghost btn--sm">
            ← В отчёты
          </Link>
        )}
        <span className="report-page__title">Гео Разум · отчёт {id}</span>
        {report && (
          <Button variant="accent" size="sm" icon={<IconDownload size={15} />} onClick={() => window.print()}>
            Скачать PDF
          </Button>
        )}
      </div>

      <div className="report-page__body">
        {error && <Alert tone="error">{error}</Alert>}
        {!report && !error && (
          <div style={{ padding: "48px 0" }}>
            <Spinner /> Загружаем отчёт…
          </div>
        )}
        {error && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Link to="/cabinet?tab=orders" className="btn btn--ghost">
              К заказам <IconArrowRight size={16} />
            </Link>
          </div>
        )}
        {report && <ReportView report={report} />}
      </div>
    </div>
  );
}
