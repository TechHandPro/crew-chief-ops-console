import { KeyRound, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatRelative, hostnameOf } from "@/lib/format";
import type { VaultEntrySummary } from "@/lib/sor";

import { RecordRow } from "./record-row";

export function VaultRow({ entry, compact = false }: { entry: VaultEntrySummary; compact?: boolean }) {
  const host = hostnameOf(entry.url);
  return (
    <RecordRow
      href={`/vault/${entry.id}`}
      leading={
        <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-bg-subtle text-fg-muted">
          <KeyRound className="size-4" aria-hidden />
        </span>
      }
      trailing={
        <time
          dateTime={entry.updatedAt ?? undefined}
          title={formatDateTime(entry.updatedAt)}
          className="pt-0.5 text-xs text-fg-faint tabular-nums"
        >
          {formatRelative(entry.updatedAt)}
        </time>
      }
    >
      <span className="block truncate text-sm font-medium text-fg group-hover:text-accent">{entry.name}</span>
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
        {entry.category ? <Badge tone="neutral">{entry.category}</Badge> : null}
        <SecretIndicators entry={entry} />
        {!compact && host ? <span className="min-w-0 truncate font-mono">{host}</span> : null}
        {!compact && entry.ticketIds.length > 0 ? (
          <span className="min-w-0 truncate font-mono">{entry.ticketIds.map((id) => `#${id}`).join(" ")}</span>
        ) : null}
      </span>
    </RecordRow>
  );
}

export function SecretIndicators({ entry }: { entry: VaultEntrySummary }) {
  return (
    <>
      {entry.hasPassword ? (
        <Badge tone="success">
          <ShieldCheck className="size-3" aria-hidden />
          secret stored
        </Badge>
      ) : (
        <Badge tone="neutral">metadata only</Badge>
      )}
      {entry.hasOtp ? <Badge tone="info">OTP</Badge> : null}
    </>
  );
}
