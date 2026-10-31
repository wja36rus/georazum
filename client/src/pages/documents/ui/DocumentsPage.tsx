import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getDocuments,
  getDocument,
  type Document,
  type DocumentMeta,
} from "@/entities/document/api";
import { Spinner } from "@/shared/ui/Spinner";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { IconFile, IconDownload } from "@/shared/icons";
import { fmtTime } from "@/shared/lib/format";
import "./documents.scss";

const DOC_TITLES: Record<string, string> = {
  offer: "Публичная оферта",
  privacy: "Политика обработки персональных данных",
  refunds: "Политика возврата денежных средств",
};

/** Страница «Документы»: список и просмотр ?doc=id. */
export function DocumentsPage() {
  const [params, setParams] = useSearchParams();
  const docParam = params.get("doc");

  const [docs, setDocs] = useState<DocumentMeta[] | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocuments()
      .then((res) => setDocs(res.documents))
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить документы."));
  }, []);

  useEffect(() => {
    if (!docParam) {
      setDocument(null);
      return;
    }
    setError(null);
    getDocument(docParam)
      .then((res) => setDocument(res.document))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Не удалось загрузить документ.");
        setDocument(null);
      });
  }, [docParam]);

  /* Просмотр конкретного документа */
  if (docParam) {
    return (
      <div className="page">
        <div className="container doc-view">
          <div className="doc-view__toolbar no-print">
            <Link to="/documents" className="btn btn--ghost btn--sm">← Все документы</Link>
            <Button variant="ghost" size="sm" icon={<IconDownload size={15} />} onClick={() => window.print()}>
              Печать / PDF
            </Button>
          </div>

          {error && <Alert tone="error">{error}</Alert>}
          {!document && !error && (
            <div style={{ padding: "40px 0" }}>
              <Spinner /> Загружаем документ…
            </div>
          )}

          {document && (
            <article className="doc-view__body print-area">
              <h1>{DOC_TITLES[document.id] ?? document.title}</h1>
              <div className="muted doc-view__meta">Редакция от {fmtTime(document.updatedAt)}</div>
              {(document.text ?? []).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </article>
          )}
        </div>
      </div>
    );
  }

  /* Список */
  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Документы</h1>
        <p className="page-sub">
          Официальные документы сервиса: оферта, политика персональных данных и правила возврата.
        </p>

        {error && <Alert tone="error">{error}</Alert>}
        {!docs && (
          <div style={{ padding: "40px 0" }}>
            <Spinner /> Загружаем документы…
          </div>
        )}

        <div className="docs-list">
          {(docs ?? []).map((d) => (
            <button
              key={d.id}
              type="button"
              className="docs-list__item card"
              onClick={() => setParams({ doc: d.id })}
            >
              <span className="docs-list__icon">
                <IconFile size={22} />
              </span>
              <span className="docs-list__meta">
                <b>{DOC_TITLES[d.id] ?? d.title}</b>
                <span className="muted">от {fmtTime(d.updatedAt)}</span>
              </span>
              <span className="btn btn--ghost btn--sm">Открыть</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
