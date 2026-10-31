import { useEffect, useState } from "react";
import { getLevels, type Level } from "@/entities/level/api";
import { Spinner } from "@/shared/ui/Spinner";
import { IconCheck, IconClose } from "@/shared/icons";
import { fmtPrice } from "@/shared/lib/format";
import "./tariffs.scss";

type Feature = { label: string; check: (l: Level) => boolean };

const FEATURES: Feature[] = [
  { label: "Правовой статус и назначение", check: () => true },
  { label: "Возможность строительства (ВРИ)", check: () => true },
  { label: "Зоны с ограничениями и обременения", check: () => true },
  { label: "Кадастровая стоимость и налоги", check: () => true },
  { label: "Проверка рисков сделки", check: (l) => l.id !== "s" },
  { label: "Оценка инфраструктуры территории", check: (l) => l.id !== "s" },
  { label: "Прогноз изменения стоимости", check: (l) => l.id === "l" },
  { label: "Финансовая модель и окупаемость", check: (l) => l.id === "l" },
  { label: "Рекомендации инвестору", check: (l) => l.id === "l" },
  { label: "Сопровождение специалиста", check: (l) => l.id === "l" },
];

/** Страница «Тарифы»: сравнение уровней в таблице. */
export function TariffsPage() {
  const [levels, setLevels] = useState<Level[] | null>(null);

  useEffect(() => {
    getLevels()
      .then(setLevels)
      .catch(() => setLevels([]));
  }, []);

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title">Тарифы</h1>
        <p className="page-sub">
          Сравните три уровня анализа и выберите подходящий. Цена фиксируется
          при оформлении заказа и не меняется в процессе.
        </p>

        {!levels && (
          <div style={{ padding: "40px 0" }}>
            <Spinner /> Загружаем тарифы…
          </div>
        )}

        {levels && (
          <div className="tariffs">
            <table className="tariffs__table">
              <thead>
                <tr>
                  <th className="tariffs__param-col">Параметр</th>
                  {levels.map((l) => (
                    <th
                      key={l.id}
                      className={
                        "tariffs__level-col tariffs__level-col--" + l.id
                      }
                    >
                      <div className="tariffs__badge">{l.id.toUpperCase()}</div>
                      {l.name.replace(/^[SML] — /, "")}
                      <div className="tariffs__price">{fmtPrice(l.price)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Срок подготовки</td>
                  {levels.map((l) => (
                    <td key={l.id}>{l.duration}</td>
                  ))}
                </tr>
                <tr>
                  <td>Аудитория</td>
                  {levels.map((l) => (
                    <td key={l.id}>{l.audience}</td>
                  ))}
                </tr>
                {FEATURES.map((f) => (
                  <tr key={f.label}>
                    <td>{f.label}</td>
                    {levels.map((l) => (
                      <td key={l.id}>
                        {f.check(l) ? (
                          <IconCheck size={18} className="tariffs__yes" />
                        ) : (
                          <IconClose size={18} className="tariffs__no" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td>Что получаете</td>
                  {levels.map((l) => (
                    <td key={l.id}>
                      <ul className="tariffs__list">
                        {(l.results ?? []).map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>
          * Точный перечень разделов зависит от доступных открытых данных по
          конкретному участку. Отчёт не является официальным документом.
        </p>
      </div>
    </div>
  );
}
