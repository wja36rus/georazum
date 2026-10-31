import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/shared/lib/format";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({ invalid, className, ...rest }: TextareaProps) {
  return <textarea className={cn("textarea", invalid && "input--error", className)} {...rest} />;
}
