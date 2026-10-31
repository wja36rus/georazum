import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, toneForStatus } from "./StatusBadge";

describe("toneForStatus", () => {
  it("маппит статусы на тона", () => {
    expect(toneForStatus("Готово")).toBe("green");
    expect(toneForStatus("Ошибка генерации")).toBe("red");
    expect(toneForStatus("Требуется вмешательство специалиста")).toBe("red");
    expect(toneForStatus("Ожидает оплаты")).toBe("warn");
    expect(toneForStatus("Выполняется анализ")).toBe("blue");
    expect(toneForStatus("Заказ создан")).toBe("gray");
  });
});

describe("StatusBadge", () => {
  it("рендерит текст статуса", () => {
    render(<StatusBadge status="Готово" />);
    expect(screen.getByText("Готово")).toBeInTheDocument();
  });

  it("готовому статусу — зелёный класс", () => {
    render(<StatusBadge status="Готово" />);
    expect(screen.getByText("Готово").className).toContain("badge-tone--green");
  });

  it("без точки, когда dot=false", () => {
    const { container } = render(<StatusBadge status="Готово" dot={false} />);
    expect(container.querySelector(".badge__dot")).not.toBeInTheDocument();
  });
});
