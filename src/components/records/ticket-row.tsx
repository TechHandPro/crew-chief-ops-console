import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatRelative, priorityTone, statusTone } from "@/lib/format";
import type { TicketSummary } from "@/lib/sor";

export function TicketRow({ ticket, compact = false }: { ticket: TicketSummary; compact?: boolean }) {
  return (
    <li>
      <Link
        href={`/tickets/${ticket.id}`}
        className="group flex items-start gap-4 px-5 py-3.5 transition hover:bg-bg-subtle/60"
      >
        <span className="w-14 shrink-0 pt-0.5 font-mono text-xs text-fg-faint tabular-nums">#{ticket.id}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg group-hover:text-accent">{ticket.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
            <Badge tone={statusTone(ticket.status)} dot>
              {ticket.status}
            </Badge>
            {ticket.priority ? <Badge tone={priorityTone(ticket.priority)}>{ticket.priority}</Badge> : null}
            {!compact && ticket.category ? <span>{ticket.category}</span> : null}
            {!compact && ticket.assignedTo ? (
              <span className="truncate">
                <span className="text-fg-faint">→</span> {ticket.assignedTo}
              </span>
            ) : null}
          </span>
        </span>
        <time
          dateTime={ticket.updatedAt ?? undefined}
          title={formatDateTime(ticket.updatedAt)}
          className="shrink-0 pt-0.5 text-xs text-fg-faint tabular-nums"
        >
          {formatRelative(ticket.updatedAt)}
        </time>
      </Link>
    </li>
  );
}
