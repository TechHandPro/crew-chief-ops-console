import type { Metadata } from "next";
import Link from "next/link";

import { DeepLink } from "@/components/deep-link";
import { DocumentRow } from "@/components/records/document-row";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { load } from "@/lib/load";
import { readPositiveInt, readString, withParams } from "@/lib/search-params";
import { getSystemOfRecord } from "@/lib/sor";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  const params = await searchParams;
  const query = readString(params, "q");
  const category = readString(params, "category");
  const ticketId = readPositiveInt(readString(params, "ticket"));

  const sor = getSystemOfRecord();
  const documents = await load(
    sor.listDocuments({
      search: query || undefined,
      category: category || undefined,
      ticketId: ticketId ?? undefined,
      limit: 100,
    }),
  );

  const categories = documents.ok
    ? [...new Set(documents.data.map((doc) => doc.category).filter((value): value is string => Boolean(value)))].sort()
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documents"
        title="Notes & documents"
        description="Runbooks, handoffs, and notes the crew synced or wrote. Bodies render as Markdown; embedded HTML is never executed."
        actions={<DeepLink href={sor.links.home()} label="Open system of record" />}
      />

      <FilterBar
        action="/documents"
        query={query}
        placeholder="Search titles and bodies…"
        hidden={{ category: category || undefined, ticket: ticketId ? String(ticketId) : undefined }}
      />

      {(categories.length > 0 || category || ticketId) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {ticketId ? (
            <Link href={withParams("/documents", { q: query || undefined, category: category || undefined })}>
              <Badge tone="info">ticket #{ticketId} ×</Badge>
            </Link>
          ) : null}
          {category ? (
            <Link href={withParams("/documents", { q: query || undefined, ticket: ticketId ? String(ticketId) : undefined })}>
              <Badge tone="accent">{category} ×</Badge>
            </Link>
          ) : (
            categories.map((value) => (
              <Link
                key={value}
                href={withParams("/documents", {
                  q: query || undefined,
                  category: value,
                  ticket: ticketId ? String(ticketId) : undefined,
                })}
              >
                <Badge tone="neutral" className="hover:border-border-strong">
                  {value}
                </Badge>
              </Link>
            ))
          )}
        </div>
      )}

      <Card>
        {documents.ok ? (
          documents.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {documents.data.map((document) => (
                <DocumentRow key={document.id} document={document} />
              ))}
            </ul>
          ) : (
            <EmptyState
              title={query ? `No documents match “${query}”` : "No documents"}
              description={category || ticketId ? "Clear the active filter to widen the search." : undefined}
            />
          )
        ) : (
          <ErrorState error={documents.error} />
        )}
      </Card>
    </div>
  );
}
