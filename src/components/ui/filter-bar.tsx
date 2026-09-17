import { Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Plain GET form so filtering works without client JavaScript and every
 * filtered view has a shareable URL.
 */
export function FilterBar({
  action,
  query,
  placeholder,
  hidden = {},
  children,
}: {
  action: string;
  query: string;
  placeholder: string;
  hidden?: Record<string, string | undefined>;
  children?: ReactNode;
}) {
  return (
    <form action={action} method="get" className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <label className="relative min-w-0 flex-1 basis-64">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-faint" aria-hidden />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-bg-elevated py-2 pr-3 pl-9 text-sm text-fg shadow-sm outline-none placeholder:text-fg-faint focus:border-ring"
        />
      </label>
      {children}
      <button
        type="submit"
        className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm font-medium text-fg shadow-sm transition hover:bg-bg-subtle"
      >
        Apply
      </button>
    </form>
  );
}

export function SegmentedLinks({
  options,
  current,
}: {
  options: Array<{ href: Route; label: string; value: string }>;
  current: string;
}) {
  return (
    <div role="group" className="inline-flex rounded-lg border border-border bg-bg-elevated p-0.5 shadow-sm">
      {options.map((option) => (
        <Link
          key={option.value}
          href={option.href}
          aria-current={option.value === current ? "true" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition",
            option.value === current ? "bg-bg-subtle text-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
