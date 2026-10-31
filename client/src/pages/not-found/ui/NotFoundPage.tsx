import { Link } from "react-router-dom";
import { LogoMark } from "@/shared/icons";

/** 404. */
export function NotFoundPage() {
  return (
    <div className="page">
      <div className="container">
        <div className="card" style={{ padding: "56px 24px", textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
          <LogoMark size={56} />
          <h1 className="page-title" style={{ marginTop: 16 }}>404</h1>
          <p className="muted">
            Такой страницы нет: возможно, она была перемещена или вы ошиблись адресом.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/" className="btn btn--accent">На главную</Link>
            <Link to="/order" className="btn btn--ghost">Проверить участок</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
