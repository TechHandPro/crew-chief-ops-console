import { Database, FlaskConical, Info, Unplug } from "lucide-react";

import { load } from "@/lib/load";
import { getSystemOfRecord } from "@/lib/sor";

/**
 * Shows where reads are coming from. Rendered inside Suspense so a slow or
 * failing handshake never blocks the rest of the shell.
 */
export async function ConnectionBadge() {
  const result = await load(getSystemOfRecord().getConnection());

  if (!result.ok) {
    const message = result.error instanceof Error ? result.error.message : "Unknown error";
    return (
      <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5" title={message}>
        <div className="flex items-center gap-2 text-danger">
          <Unplug className="size-4" aria-hidden />
          <p className="text-xs font-semibold">Disconnected</p>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] text-fg-muted">{message}</p>
      </div>
    );
  }

  const connection = result.data;
  const demo = connection.routing === "demo";
  const Icon = demo ? FlaskConical : Database;
  const organization =
    connection.organizationName ?? (connection.organizationId ? `Organization #${connection.organizationId}` : "Unpinned");

  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className={demo ? "text-warning" : "text-success"}>
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-fg">{connection.systemName}</p>
          <p className="truncate text-[11px] text-fg-muted">{organization}</p>
        </div>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-bg-subtle px-1.5 py-0.5 text-[10px] font-medium tracking-wide whitespace-nowrap text-fg-muted uppercase">
          Read-only
        </span>
      </div>
      {connection.endpoint ? (
        <p className="mt-1.5 truncate font-mono text-[11px] text-fg-faint" title={connection.endpoint}>
          {connection.endpoint}
        </p>
      ) : null}
      {demo ? (
        <p className="mt-1.5 text-[11px] text-fg-muted">Fictional data, no credentials. Connect a system of record to see real work.</p>
      ) : null}
      {connection.routingNote ? (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] text-warning" title={connection.routingNote}>
          <Info className="mt-px size-3 shrink-0" aria-hidden />
          <span className="line-clamp-3">{connection.routingNote}</span>
        </p>
      ) : null}
    </div>
  );
}

export function ConnectionBadgeSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="size-4 animate-pulse rounded bg-bg-subtle" />
        <div className="flex-1 space-y-1.5">
          <span className="block h-2.5 w-24 animate-pulse rounded bg-bg-subtle" />
          <span className="block h-2 w-16 animate-pulse rounded bg-bg-subtle" />
        </div>
      </div>
    </div>
  );
}
