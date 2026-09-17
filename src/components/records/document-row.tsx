import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatRelative, truncate } from "@/lib/format";
import type { DocumentSummary } from "@/lib/sor";

import { RecordRow } from "./record-row";

export function DocumentRow({ document, compact = false }: { document: DocumentSummary; compact?: boolean }) {
  return (
    <RecordRow
      href={`/documents/${document.id}`}
      leading={
        <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-bg-subtle text-fg-muted">
          <FileText className="size-4" aria-hidden />
        </span>
      }
      trailing={
        <time
          dateTime={document.updatedAt ?? undefined}
          title={formatDateTime(document.updatedAt)}
          className="pt-0.5 text-xs text-fg-faint tabular-nums"
        >
          {formatRelative(document.updatedAt)}
        </time>
      }
    >
      <span className="block truncate text-sm font-medium text-fg group-hover:text-accent">{document.title}</span>
      {!compact && document.bodyPreview ? (
        <span className="mt-0.5 block truncate text-xs text-fg-muted">
          {truncate(stripSyncMarkers(document.bodyPreview), 140)}
        </span>
      ) : null}
      <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
        {document.category ? <Badge tone="neutral">{document.category}</Badge> : null}
        {document.visibility ? (
          <Badge tone={document.visibility === "client" ? "info" : "neutral"}>{document.visibility}</Badge>
        ) : null}
        {document.ticketId ? <span className="font-mono">ticket #{document.ticketId}</span> : null}
        {!compact && document.createdBy ? <span className="min-w-0 truncate">by {document.createdBy}</span> : null}
      </span>
    </RecordRow>
  );
}

/** Repo-sync headers are useful to bots and noise to humans. */
export function stripSyncMarkers(text: string): string {
  return text.replace(/<!--\s*repo-[a-z-]+:[^>]*-->/g, "").trim();
}
