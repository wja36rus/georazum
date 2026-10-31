import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/format";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
  children: ReactNode;
};

export function Card({ padded, className, children, ...rest }: CardProps) {
  return (
    <div className={cn("card", padded && "card--pad", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="card-title">{children}</div>;
}
