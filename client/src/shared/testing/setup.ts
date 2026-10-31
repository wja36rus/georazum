import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/* После каждого теста — размонтирование DOM и очистка localStorage. */
afterEach(() => {
  cleanup();
  localStorage.clear();
});
