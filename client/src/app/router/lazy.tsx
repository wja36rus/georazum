import { lazy, type ComponentType } from "react";

/**
 * Ленивая загрузка страницы по имени экспорта.
 * Пример: lazyPage(() => import("@/pages/home/ui/HomePage"), "HomePage")
 */
export function lazyPage(
  loader: () => Promise<Record<string, ComponentType>>,
  name: string,
) {
  return lazy(() => loader().then((m) => ({ default: m[name] })));
}
