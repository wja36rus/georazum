import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/format";

type Variant = "primary" | "accent" | "green" | "ghost" | "danger" | "outline-danger" | "link";
type Size = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Иконка слева от текста. */
  icon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  block,
  icon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("btn", `btn--${variant}`, size !== "md" && `btn--${size}`, block && "btn--block", className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
