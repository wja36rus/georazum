import { describe, expect, it } from "vitest";
import { cardError, isCadastral, isEmail, isPhone, isStrongPassword, orderError } from "./validators";

describe("isCadastral", () => {
  it("принимает корректный номер", () => {
    expect(isCadastral("36:16:3405742:189")).toBe(true);
    expect(isCadastral(" 36:25:6945030:776 ")).toBe(true);
  });
  it("отклоняет неверные форматы", () => {
    expect(isCadastral("123")).toBe(false);
    expect(isCadastral("36:16:3405742")).toBe(false);
    expect(isCadastral("36:16:3405742:18")).toBe(false);
    expect(isCadastral("36163405742:189")).toBe(false);
    expect(isCadastral("ab:cd:efg:123")).toBe(false);
  });
});

describe("isEmail / isPhone / isStrongPassword", () => {
  it("email", () => {
    expect(isEmail("ivan@mail.ru")).toBe(true);
    expect(isEmail("no-at-sign")).toBe(false);
    expect(isEmail("a@b")).toBe(false);
  });
  it("телефон — 11 цифр", () => {
    expect(isPhone("+7 (900) 123-45-67")).toBe(true);
    expect(isPhone("12345")).toBe(false);
  });
  it("пароль — от 8 символов", () => {
    expect(isStrongPassword("demo1234")).toBe(true);
    expect(isStrongPassword("short1")).toBe(false);
  });
});

describe("cardError", () => {
  const valid = { number: "4111111111111111", expiry: "12/30", cvv: "123", holder: "IVAN IVANOV" };

  it("вальная карта — без ошибок", () => {
    expect(cardError(valid)).toBe("");
  });
  it("номер карты не 16 цифр", () => {
    expect(cardError({ ...valid, number: "4242" })).toContain("16 цифр");
    expect(cardError({ ...valid, number: "" })).toContain("16 цифр");
  });
  it("срок действия в прошлом", () => {
    expect(cardError({ ...valid, expiry: "01/20" })).toContain("истёк");
  });
  it("некорректный формат срока", () => {
    expect(cardError({ ...valid, expiry: "13/30" })).toContain("месяц");
    expect(cardError({ ...valid, expiry: "123" })).toContain("ММ/ГГ");
  });
  it("CVV не 3 цифры", () => {
    expect(cardError({ ...valid, cvv: "12" })).toContain("CVV");
  });
  it("владелец не указан", () => {
    expect(cardError({ ...valid, holder: "A" })).toContain("владельца");
  });
});

describe("orderError", () => {
  it("проверяет кадастровый номер, оферту и версию", () => {
    expect(orderError("bad", true, "1.0")).toContain("формате");
    expect(orderError("36:16:3405742:189", false, "1.0")).toContain("оферты");
    expect(orderError("36:16:3405742:189", true, "")).toContain("версия");
    expect(orderError("36:16:3405742:189", true, "1.0")).toBe("");
  });
});
