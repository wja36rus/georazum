import { useMemo } from "react";
import { cn } from "@/shared/lib/format";

export type TabItem<T extends string> = {
  key: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
};

export type TabsProps<T extends string> = {
  items: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
};

export function Tabs<T extends string>({ items, active, onChange }: TabsProps<T>) {
  const tabId = useMemo(() => "tab-" + Math.random().toString(36).slice(2, 8), []);

  return (
    <div className="tabs" role="tablist">
      {items.map((item) => {
        const id = `${tabId}-${item.key}`;
        const selected = item.key === active;
        return (
          <button
            key={item.key}
            id={id}
            role="tab"
            aria-selected={selected}
            type="button"
            className={cn("tabs__tab", selected && "tabs__tab--active")}
            onClick={() => onChange(item.key)}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && <span className="muted nowrap">({item.count})</span>}
          </button>
        );
      })}
    </div>
  );
}
