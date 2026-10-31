import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLevels, LEVEL_ORDER, type Level } from "@/entities/level/api";
import { Spinner } from "@/shared/ui/Spinner";
import { IconCheck } from "@/shared/icons";
import { fmtPrice } from "@/shared/lib/format";
import { LEVEL_META } from "@/features/order-wizard/lib/stepper";
import "./levels.scss";

const LEVEL_DETAILS: Record<Level["id"], string> = {
  s: "Базовый экспресс-анализ: правовой статус, возможность строительства, ограничения и стоимость.",
  m: "Расширенный анализ для сделок: всё из S плюс глубокая проверка рисков, инфраструктуры и перспектив территории.",
  l: "Инвестиционный анализ: полная финансовая модель, окупаемость, доходность и рекомендации для инвестора.",
};

/** Страница «Уровни анализа» с якорями #level-s/m/l. */
export function LevelsPage() {
  const [levels, setLevels] = useState<Level[] | null>(null);

  useEffect(() => {
    getLevels()
      .then(setLevels)
      .catch(() => setLevels([]));
  }, []);

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Уровни анализа</h1>
        <p className="page-sub">
          Три уровня проработки — от быстрой проверки до полноценного инвестиционного заключения.
          Нажмите «Заказать», чтобы начать — кадастровый номер можно ввести на следующем шаге.
        </p>

        {!levels && (
          <div style={{ padding: "40px 0" }}>
            <Spinner /> Загружаем тарифы…
          </div>
        )}

        <div className="levels-list">
          {LEVEL_ORDER.map((id, idx) => {
            const level = levels?.find((l) => l.id === id);
            if (!level) return null;
            const meta = LEVEL_META[id];
            return (
              <section key={id} id={"level-" + id} className="card levels-block" style={{ borderTop: "3px solid " + meta.color }}>
                <div className="levels-block__head">
                  <span className="levels-block__badge" style={{ color: meta.color }}>
                    {meta.short}
                  </span>
                  <div>
                    <h2 style={{ marginBottom: 4 }}>{level.name.replace(/^[SML] — /, "")}</h2>
                    <p className="levels-block__detail">{LEVEL_DETAILS[id]}</p>
                  </div>
                </div>

                <div className="levels-block__grid">
                  <div>
                    <div className="levels-block__label">Срок</div>
                    <b>{level.duration}</b>
                  </div>
                  <div>
                    <div className="levels-block__label">Стоимость</div>
                    <b className="levels-block__price">{fmtPrice(level.price)}</b>
                  </div>
                  <div>
                    <div className="levels-block__label">Аудитория</div>
                    <b>{level.audience}</b>
                  </div>
                  <div>
                    <div className="levels-block__label">Номер в списке</div>
                    <b>#{idx + 1}</b>
                  </div>
                </div>

                <div className="levels-block__cols">
                  <div>
                    <h4>Что входит</h4>
                    <ul className="levels-block__list">
                      {level.includes.map((i) => (
                        <li key={i}>
                          <IconCheck size={15} /> {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Результаты</h4>
                    <ul className="levels-block__list">
                      {(level.results ?? []).map((r) => (
                        <li key={r}>
                          <IconCheck size={15} /> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="levels-block__actions">
                  {idx > 0 && <Link to={"#level-" + LEVEL_ORDER[idx - 1]} className="btn btn--ghost btn--sm">← Предыдущий</Link>}
                  {idx + 1 < LEVEL_ORDER.length && <Link to={"#level-" + LEVEL_ORDER[idx + 1]} className="btn btn--ghost btn--sm">Следующий →</Link>}
                  <Link
                    to={"/order?level=" + level.id}
                    className={"btn btn--sm " + (level.available === false ? "btn--ghost" : "btn--accent")}
                    onClick={(e) => level.available === false && e.preventDefault()}
                  >
                    {level.available === false ? "Временно недоступен" : "Заказать за " + fmtPrice(level.price)}
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
