import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatRelative, priorityTone, statusTone } from "@/lib/format";
import type { TicketSummary } from "@/lib/sor";

import { RecordRow } from "./record-row";

export function TicketRow({ ticket, compact = false }: { ticket: TicketSummary; compact?: boolean }) {
  return (
    <RecordRow
      href={`/tickets/${ticket.id}`}
      leading={
        <span className="block w-14 pt-0.5 font-mono text-xs text-fg-faint tabular-nums">#{ticket.id}</span>
      }
      trailing={
        <time
          dateTime={ticket.updatedAt ?? undefined}
          title={formatDateTime(ticket.updatedAt)}
          className="pt-0.5 text-xs text-fg-faint tabular-nums"
        >
          {formatRelative(ticket.updatedAt)}
        </time>
      }
    >
      <span className="block truncate text-sm font-medium text-fg group-hover:text-accent">{ticket.title}</span>
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
        <Badge tone={statusTone(ticket.status)} dot>
          {ticket.status}
        </Badge>
        {ticket.priority ? <Badge tone={priorityTone(ticket.priority)}>{ticket.priority}</Badge> : null}
        {!compact && ticket.category ? <span>{ticket.category}</span> : null}
        {!compact && ticket.assignedTo ? (
          <span className="min-w-0 truncate">
            <span className="text-fg-faint">→</span> {ticket.assignedTo}
          </span>
        ) : null}
      </span>
    </RecordRow>
  );
}
