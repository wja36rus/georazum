import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/Button";
import { IconCheck } from "@/shared/icons";
import { fmtPrice } from "@/shared/lib/format";
import type { Level } from "@/entities/level/api";
import "./level-card.scss";

export type LevelCardProps = {
  level: Level;
  /** Цвет акцента уровня: s — голубой, m — зелёный, l — жёлтый/оранжевый. */
  accent?: "blue" | "green" | "warn";
  action?: "link" | "order";
  /** Компактный режим для страницы «Уровни». */
  compact?: boolean;
};

const ACCENT: Record<NonNullable<LevelCardProps["accent"]>, string> = {
  blue: "#1f9ad6",
  green: "#2e9e5b",
  warn: "#d98b1f",
};

export function LevelCard({
  level,
  accent = "blue",
  action = "order",
  compact,
}: LevelCardProps) {
  const color = ACCENT[accent];
  const navigate = useNavigate();
  return (
    <article
      className="level-card card"
      style={{ borderTop: "3px solid " + color }}
    >
      <div className="level-card__badge" style={{ color }}>
        {level.id.toUpperCase()}
      </div>
      <h3 className="level-card__name">
        {level.name.replace(/^[SML] — /, "")}
      </h3>
      <p className="level-card__tagline">{level.tagline}</p>

      <dl className="level-card__meta">
        <div>
          <dt>Срок</dt>
          <dd>{level.duration}</dd>
        </div>
        <div>
          <dt>Стоимость</dt>
          <dd className="level-card__price">{fmtPrice(level.price)}</dd>
        </div>
      </dl>

      {!compact && (
        <ul className="level-card__list">
          {(level.results ?? []).slice(0, 5).map((r) => (
            <li key={r}>
              <IconCheck size={15} /> {r}
            </li>
          ))}
        </ul>
      )}

      <div className="level-card__actions">
        <Link
          to={"/levels#level-" + level.id}
          className="btn btn--ghost btn--sm"
        >
          Подробнее
        </Link>
        <Button
          size="sm"
          onClick={() => navigate("/order?level=" + level.id)}
          disabled={level.available === false}
        >
          {level.available === false ? "Недоступен" : "Заказать"}
        </Button>
      </div>
      {action === "link" && (
        <div className="level-card__link">Подробнее про уровень →</div>
      )}
    </article>
  );
}
