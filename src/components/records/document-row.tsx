import { FileText } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatRelative, truncate } from "@/lib/format";
import type { DocumentSummary } from "@/lib/sor";

export function DocumentRow({ document, compact = false }: { document: DocumentSummary; compact?: boolean }) {
  return (
    <li>
      <Link
        href={`/documents/${document.id}`}
        className="group flex items-start gap-4 px-5 py-3.5 transition hover:bg-bg-subtle/60"
      >
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-bg-subtle text-fg-muted">
          <FileText className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg group-hover:text-accent">{document.title}</span>
          {!compact && document.bodyPreview ? (
            <span className="mt-0.5 block truncate text-xs text-fg-muted">{truncate(stripSyncMarkers(document.bodyPreview), 140)}</span>
          ) : null}
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
            {document.category ? <Badge tone="neutral">{document.category}</Badge> : null}
            {document.visibility ? <Badge tone={document.visibility === "client" ? "info" : "neutral"}>{document.visibility}</Badge> : null}
            {document.ticketId ? <span className="font-mono">ticket #{document.ticketId}</span> : null}
            {!compact && document.createdBy ? <span className="truncate">by {document.createdBy}</span> : null}
          </span>
        </span>
        <time
          dateTime={document.updatedAt ?? undefined}
          title={formatDateTime(document.updatedAt)}
          className="shrink-0 pt-0.5 text-xs text-fg-faint tabular-nums"
        >
          {formatRelative(document.updatedAt)}
        </time>
      </Link>
    </li>
  );
}

/** Repo-sync headers are useful to bots and noise to humans. */
export function stripSyncMarkers(text: string): string {
  return text.replace(/<!--\s*repo-[a-z-]+:[^>]*-->/g, "").trim();
}
