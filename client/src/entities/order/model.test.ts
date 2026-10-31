import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  isActiveGeneration,
  isFailed,
  isFinished,
  isPaid,
  statusIndex,
} from "./api";

describe("Модель заказа — статусы", () => {
  it("содержит все 10 статусов ТЗ в правильном порядке", () => {
    expect(ORDER_STATUSES).toHaveLength(10);
    expect(ORDER_STATUSES[0]).toBe("Заказ создан");
    expect(ORDER_STATUSES[1]).toBe("Ожидает оплаты");
    expect(ORDER_STATUSES[2]).toBe("Оплачен");
    expect(ORDER_STATUSES[3]).toBe("Передан в обработку");
    expect(ORDER_STATUSES).toContain("Сбор исходных данных");
    expect(ORDER_STATUSES).toContain("Выполняется анализ");
    expect(ORDER_STATUSES).toContain("Формируется PDF");
    expect(ORDER_STATUSES[7]).toBe("Готово");
    expect(ORDER_STATUSES).toContain("Ошибка генерации");
    expect(ORDER_STATUSES).toContain("Требуется вмешательство специалиста");
  });

  it("определяет активную генерацию", () => {
    expect(isActiveGeneration("Выполняется анализ")).toBe(true);
    expect(isActiveGeneration("Готово")).toBe(false);
    expect(isActiveGeneration("Ожидает оплаты")).toBe(false);
  });

  it("определяет финальные статусы", () => {
    expect(isFinished("Готово")).toBe(true);
    expect(isFinished("Ошибка генерации")).toBe(true);
    expect(isFinished("Выполняется анализ")).toBe(false);
  });

  it("определяет статусы-ошибки (доступен ретрай)", () => {
    expect(isFailed("Ошибка генерации")).toBe(true);
    expect(isFailed("Требуется вмешательство специалиста")).toBe(true);
    expect(isFailed("Готово")).toBe(false);
  });

  it("определяет оплаченные статусы", () => {
    expect(isPaid("Оплачен")).toBe(true);
    expect(isPaid("Готово")).toBe(true);
    expect(isPaid("Ожидает оплаты")).toBe(false);
  });

  it("даёт порядковый номер статуса для прогресса", () => {
    expect(statusIndex("Заказ создан")).toBe(0);
    expect(statusIndex("Готово")).toBe(7);
    expect(statusIndex("Неизвестный")).toBe(0);
  });
});
