import { cn } from "@/shared/lib/format";

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("spinner", className)} aria-label="Загрузка…" />;
}

export function Loading({ text = "Загрузка…" }: { text?: string }) {
  return (
    <div className="loading">
      <Spinner />
      {text}
    </div>
  );
}
