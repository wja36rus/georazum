import { describe, expect, it } from "vitest";
import {
  cn,
  digits,
  fmtPrice,
  initials,
  phoneHref,
  upperFirst,
} from "./format";

describe("digits", () => {
  it("оставляет только цифры", () => {
    expect(digits("+7 (900) 123-45-67")).toBe("79001234567");
    expect(digits("abc123")).toBe("123");
    expect(digits(null)).toBe("");
    expect(digits(undefined)).toBe("");
  });
});

describe("fmtPrice", () => {
  it("форматирует по-русски с символом ₽", () => {
    // ru-RU использует неразрывный пробел (U+00A0) как разделитель групп
    const norm = (s: string) => s.replace(/\u00A0/g, " ");
    expect(norm(fmtPrice(4900))).toBe("4 900 ₽");
    expect(norm(fmtPrice(14900))).toBe("14 900 ₽");
    expect(fmtPrice(null)).toBe("—");
    expect(fmtPrice(undefined)).toBe("—");
  });
});

describe("cn", () => {
  it("склеивает классы, отбрасывая пустые", () => {
    expect(cn("a", false, undefined, "b", null)).toBe("a b");
    expect(cn()).toBe("");
  });
});

describe("upperFirst / initials", () => {
  it("верхний регистр первой буквы", () => {
    expect(upperFirst("иван")).toBe("Иван");
    expect(upperFirst("")).toBe("");
  });
  it("инициалы из имени и фамилии", () => {
    expect(initials("Иван Иванов")).toBe("ИИ");
    expect(initials("Пётр")).toBe("П");
    expect(initials("")).toBe("");
  });
});

describe("phoneHref", () => {
  it("tel: с цифрами", () => {
    expect(phoneHref("+7 (900) 123-45-67")).toBe("tel:+79001234567");
  });
});
