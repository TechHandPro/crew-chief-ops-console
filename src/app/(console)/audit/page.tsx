import { ScrollText } from "lucide-react";
import type { Metadata } from "next";

import { AuditRow } from "@/components/records/audit-row";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { listAuditPreview } from "@/lib/audit";
import { readString } from "@/lib/search-params";

export const metadata: Metadata = { title: "Audit" };

/**
 * Access policy (fixtures preview):
 * - This route lives under the gated console layout (`requireAccess`).
 *   It is not in `PUBLIC_PATHS`.
 * - Rows come from `listAuditPreview` only. This page must not import the
 *   live provider or follow production ticket/document/vault deep links.
 * - Live SoR audit wiring stays held until a Challenger decision.
 */
export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  const params = await searchParams;
  const query = readString(params, "q");
  const events = listAuditPreview({ search: query || undefined });

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Audit"
        title="Who did what"
        description="A read-only preview of crew actions against tickets, documents, and vault metadata. These rows are demo fixtures."
      />

      <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning-soft/60 px-4 py-3 text-sm">
        <ScrollText className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <p className="min-w-0 text-fg-muted">
          <span className="font-medium text-fg">Demo preview.</span> This page does not read the live system of
          record, and resource links open the fixtures host only — not production tickets, documents, or vault
          entries. Live audit wiring is held.
        </p>
      </div>

      <FilterBar action="/audit" query={query} placeholder="Search actor, action, or resource…" />

      <Card>
        {events.length > 0 ? (
          <ul className="divide-y divide-border">
            {events.map((event) => (
              <AuditRow key={event.id} event={event} />
            ))}
          </ul>
        ) : (
          <EmptyState
            title={query ? `No audit rows match “${query}”` : "No audit rows"}
            description={query ? "Clear the search to show the demo dataset." : undefined}
          />
        )}
      </Card>
    </div>
  );
}
