import type { ReactNode } from "react";
import { cn } from "@/shared/lib/format";

type Tone = "info" | "success" | "error" | "warn";

export type AlertProps = {
  tone?: Tone;
  /** Заголовок (жирным). */
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Alert({ tone = "info", title, children, className }: AlertProps) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("alert", `alert--${tone}`, className)}>
      <div>
        {title && <b>{title} </b>}
        {children}
      </div>
    </div>
  );
}
