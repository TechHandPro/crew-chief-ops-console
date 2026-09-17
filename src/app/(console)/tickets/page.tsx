import type { Metadata } from "next";

import { DeepLink } from "@/components/deep-link";
import { TicketRow } from "@/components/records/ticket-row";
import { Card } from "@/components/ui/card";
import { FilterBar, SegmentedLinks } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { load } from "@/lib/load";
import { readFlag, readString, withParams } from "@/lib/search-params";
import { getSystemOfRecord } from "@/lib/sor";

export const metadata: Metadata = { title: "Tickets" };

export default async function TicketsPage({ searchParams }: PageProps<"/tickets">) {
  const params = await searchParams;
  const query = readString(params, "q");
  const showAll = readFlag(params, "all");

  const sor = getSystemOfRecord();
  const tickets = await load(sor.listTickets({ search: query || undefined, openOnly: !showAll, limit: 100 }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tickets"
        title="Tickets"
        description="Work items created and updated by the crew. Open a ticket for its description and comment history."
        actions={<DeepLink href={sor.links.home()} label="Open system of record" />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <FilterBar
            action="/tickets"
            query={query}
            placeholder="Search by title or tag…"
            hidden={{ all: showAll ? "1" : undefined }}
          />
        </div>
        <SegmentedLinks
          current={showAll ? "all" : "open"}
          options={[
            { value: "open", label: "Open", href: withParams("/tickets", { q: query || undefined }) },
            { value: "all", label: "All", href: withParams("/tickets", { q: query || undefined, all: "1" }) },
          ]}
        />
      </div>

      <Card>
        {tickets.ok ? (
          tickets.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {tickets.data.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </ul>
          ) : (
            <EmptyState
              title={query ? `No tickets match “${query}”` : showAll ? "No tickets" : "No open tickets"}
              description={showAll ? undefined : "Switch to All to include resolved and closed work."}
            />
          )
        ) : (
          <ErrorState error={tickets.error} />
        )}
      </Card>
    </div>
  );
}
