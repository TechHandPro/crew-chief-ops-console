import { FileText, KeyRound, Ticket } from "lucide-react";

import { DeepLink } from "@/components/deep-link";
import { Badge } from "@/components/ui/badge";
import {
  auditActionLabel,
  auditDemoResourceHref,
  auditResourceKindLabel,
  type AuditEvent,
  type AuditResourceKind,
} from "@/lib/audit";
import { formatDateTime, formatRelative } from "@/lib/format";

import { RecordRow } from "./record-row";

export function AuditRow({ event }: { event: AuditEvent }) {
  return (
    <RecordRow
      leading={<ResourceGlyph kind={event.resource.kind} />}
      trailing={
        <time
          dateTime={event.occurredAt}
          title={formatDateTime(event.occurredAt)}
          className="pt-0.5 text-xs text-fg-faint tabular-nums"
        >
          {formatRelative(event.occurredAt)}
        </time>
      }
    >
      <span className="block min-w-0 truncate text-sm font-medium text-fg">{auditActionLabel(event.action)}</span>
      <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
        <span className="min-w-0 truncate">{event.actor ?? "Unknown actor"}</span>
        <Badge tone="neutral">
          {auditResourceKindLabel(event.resource.kind)} #{event.resource.id}
        </Badge>
        <span className="min-w-0 truncate">{event.resource.label}</span>
        <DeepLink href={auditDemoResourceHref(event.resource)} label="Demo record" variant="inline" />
      </span>
    </RecordRow>
  );
}

function ResourceGlyph({ kind }: { kind: AuditResourceKind }) {
  return (
    <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-bg-subtle text-fg-muted">
      {resourceGlyph(kind)}
    </span>
  );
}

function resourceGlyph(kind: AuditResourceKind) {
  switch (kind) {
    case "ticket":
      return <Ticket className="size-4" aria-hidden />;
    case "document":
      return <FileText className="size-4" aria-hidden />;
    case "vault":
      return <KeyRound className="size-4" aria-hidden />;
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unknown audit resource kind: ${String(exhaustive)}`);
    }
  }
}
