export type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  /** Цвет значения. */
  tone?: "blue" | "green" | "red" | "gray" | "warn";
};

const TONE_COLOR: Record<NonNullable<StatCardProps["tone"]>, string> = {
  blue: "var(--blue-dark)",
  green: "var(--green-dark)",
  red: "var(--danger)",
  warn: "var(--warn)",
  gray: "var(--text)",
};

export function StatCard({ label, value, hint, tone = "gray" }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value" style={{ color: TONE_COLOR[tone] }}>
        {value}
      </div>
      {hint && <div className="stat-card__hint">{hint}</div>}
    </div>
  );
}
