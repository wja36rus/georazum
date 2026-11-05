import type { Level } from "@/entities/level/api";

export type WizardStepId = 1 | 2 | 3 | 4 | 5 | 6;

export const STEP_LABELS: Record<WizardStepId, string> = {
  1: "Участки",
  2: "Уровень",
  3: "Параметры",
  4: "Заказчик",
  5: "Контакты",
  6: "Проверка и оплата",
};

/** Подпись шага параметров зависит от уровня (M или L). */
export function stepLabel(step: WizardStepId, level: string | null): string {
  if (step === 3) return level === "m" ? "Параметры M" : "Параметры L";
  return STEP_LABELS[step];
}

/**
 * Шаги визарда:
 * - S — без шага параметров (п. 3.5: «При выборе S пользователь сразу
 *   переходит к шагу 4» — тип заказчика);
 * - M и L — с шагом параметров (п. 4: анкеты M/L).
 */
export function stepsFor(
  level: string | null,
  step: WizardStepId,
): WizardStepId[] {
  const withParams = level === "m" || level === "l";
  const all: WizardStepId[] = withParams ? [1, 2, 3, 4, 5, 6] : [1, 2, 4, 5, 6];
  // Текущий шаг всегда включаем, чтобы не прыгать вперёд при смене уровня.
  return Array.from(new Set<WizardStepId>([...all, step])).sort(
    (a, b) => a - b,
  );
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
