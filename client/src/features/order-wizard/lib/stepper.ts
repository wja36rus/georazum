import type { Level } from "@/entities/level/api";

export type WizardStepId = 1 | 2 | 3 | 4 | 5;

export const STEP_LABELS: Record<WizardStepId, string> = {
  1: "Кадастровый номер",
  2: "Уровень анализа",
  3: "Параметры инвестора",
  4: "Оферта",
  5: "Подтверждение",
};

/** Шаги: для L добавляется шаг 3 (инвест-параметры). */
export function stepsFor(level: string | null, step: WizardStepId): WizardStepId[] {
  const withInvestor = level === "l";
  const all: WizardStepId[] = withInvestor ? [1, 2, 3, 4, 5] : [1, 2, 4, 5];
  // Текущий шаг всегда включаем, чтобы не прыгать вперёд при смене уровня.
  return Array.from(new Set<WizardStepId>([...all, step])).sort((a, b) => a - b);
}

/** Инвест-параметры уровня L (из ТЗ). */
export const LEVEL_META: Record<string, { short: string; color: string }> = {
  s: { short: "S", color: "#1f9ad6" },
  m: { short: "M", color: "#2e9e5b" },
  l: { short: "L", color: "#d98b1f" },
};

export function isLevelAvailable(level: Level): boolean {
  return level.available !== false;
}
