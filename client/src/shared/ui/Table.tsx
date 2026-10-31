import type { ReactNode } from "react";
import { cn } from "@/shared/lib/format";

export type TableColumn<T> = {
  key: string;
  title: ReactNode;
  render: (row: T) => ReactNode;
  /** CSS-ширина колонки. */
  width?: string | number;
  className?: string;
};

export type TableProps<T> = {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  /** Текст пустого состояния. */
  empty?: string;
  className?: string;
};

/** Простая таблица на HTML-таблице с готовыми стилями .table. */
export function Table<T>({ columns, data, rowKey, empty = "Нет данных", className }: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="card" style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
        {empty}
      </div>
    );
  }

  return (
    <div className={cn("table-wrap", className)}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.width != null ? { width: c.width } : undefined}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => (
                <td key={c.key} className={c.className}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
