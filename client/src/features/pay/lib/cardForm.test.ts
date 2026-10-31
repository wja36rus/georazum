import { describe, expect, it } from "vitest";
import { formatCardNumber, formatCvv, formatExpiry } from "./cardForm";

describe("форматирование полей карты", () => {
  it("группирует номер по 4 и ограничивает 16 цифр", () => {
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("4111-1111-1111-1111-9999")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("abc")).toBe("");
    expect(formatCardNumber("424242")).toBe("4242 42");
  });

  it("форматирует срок ММ/ГГ", () => {
    expect(formatExpiry("1230")).toBe("12/30");
    expect(formatExpiry("12")).toBe("12");
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("123456")).toBe("12/34");
  });

  it("ограничивает CVV тремя цифрами", () => {
    expect(formatCvv("1234")).toBe("123");
    expect(formatCvv("")).toBe("");
  });
});
