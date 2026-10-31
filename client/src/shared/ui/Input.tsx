import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/format";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({ invalid, className, ...rest }: InputProps) {
  return <input className={cn("input", invalid && "input--error", className)} {...rest} />;
}
