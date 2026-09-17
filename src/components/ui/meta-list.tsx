import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface MetaItem {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

/** Key/value grid for record metadata. Skips items with empty values. */
export function MetaList({ items, columns = 2 }: { items: MetaItem[]; columns?: 1 | 2 | 3 }) {
  const visible = items.filter((item) => item.value !== null && item.value !== undefined && item.value !== "");
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-3 text-sm",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {visible.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium tracking-wide text-fg-muted uppercase">{item.label}</dt>
          <dd className={cn("mt-0.5 break-words text-fg", item.mono && "font-mono text-[13px]")}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
