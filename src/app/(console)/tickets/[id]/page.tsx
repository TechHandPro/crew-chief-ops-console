import { Lock, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeepLink } from "@/components/deep-link";
import { Markdown } from "@/components/markdown";
import { DocumentRow } from "@/components/records/document-row";
import { VaultRow } from "@/components/records/vault-row";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MetaList } from "@/components/ui/meta-list";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { formatDateTime, formatRelative, initials, priorityTone, statusTone } from "@/lib/format";
import { load } from "@/lib/load";
import { readPositiveInt } from "@/lib/search-params";
import { getSystemOfRecord } from "@/lib/sor";

export async function generateMetadata({ params }: PageProps<"/tickets/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Ticket #${id}` };
}

export default async function TicketDetailPage({ params }: PageProps<"/tickets/[id]">) {
  const { id: rawId } = await params;
  const id = readPositiveInt(rawId);
  if (!id) notFound();

  const sor = getSystemOfRecord();
  const ticket = await load(sor.getTicket(id));
  if (ticket.ok && !ticket.data) notFound();

  const [documents, vault] = await Promise.all([
    load(sor.listDocuments({ ticketId: id, limit: 20 })),
    load(sor.listVaultEntries({ ticketId: id })),
  ]);

  if (!ticket.ok) {
    return (
      <div className="space-y-6">
        <BackLink href="/tickets">Tickets</BackLink>
        <Card>
          <ErrorState error={ticket.error} />
        </Card>
      </div>
    );
  }

  const record = ticket.data!;
  const deepLink = sor.links.ticket(record.id);

  return (
    <div className="space-y-6">
      <BackLink href="/tickets">Tickets</BackLink>

      <PageHeader
        eyebrow={<span className="font-mono normal-case">Ticket #{record.id}</span>}
        title={record.title}
        actions={<DeepLink href={deepLink} label="Open in system of record" />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(record.status)} dot>
          {record.status}
        </Badge>
        {record.priority ? <Badge tone={priorityTone(record.priority)}>{record.priority} priority</Badge> : null}
        {record.type ? <Badge>{record.type}</Badge> : null}
        {record.category ? <Badge>{record.category}</Badge> : null}
        {record.tags.map((tag) => (
          <Badge key={tag} tone="neutral" className="font-mono">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Description" />
            <CardBody>
              {record.description.trim() ? (
                <Markdown>{record.description}</Markdown>
              ) : (
                <p className="text-sm text-fg-muted italic">No description.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={`Comments (${record.comments.length})`}
              description="Most recent last, as recorded in the system of record."
            />
            {record.comments.length > 0 ? (
              <ol className="divide-y divide-border">
                {record.comments.map((comment) => (
                  <li key={comment.id} className="flex gap-3 px-5 py-4">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-bg-subtle text-xs font-semibold text-fg-muted">
                      {initials(comment.author)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
                        <span className="font-medium text-fg">{comment.author ?? "Unknown"}</span>
                        <time dateTime={comment.createdAt ?? undefined} title={formatDateTime(comment.createdAt)}>
                          {formatRelative(comment.createdAt)}
                        </time>
                        {comment.isInternal ? (
                          <Badge tone="neutral">
                            <Lock className="size-3" aria-hidden />
                            internal
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1.5">
                        <Markdown>{comment.body}</Markdown>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={MessageSquare} title="No comments yet" />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <MetaList
                columns={1}
                items={[
                  { label: "Assigned to", value: record.assignedTo },
                  { label: "Source", value: record.source },
                  { label: "Organization", value: record.organizationId ? `#${record.organizationId}` : null, mono: true },
                  { label: "Created", value: formatDateTime(record.createdAt) },
                  { label: "Updated", value: formatDateTime(record.updatedAt) },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Linked documents" action={<Link href={`/documents?ticket=${record.id}`} className="text-xs font-medium text-fg-muted hover:text-accent">Browse</Link>} />
            {documents.ok ? (
              documents.data.length > 0 ? (
                <ul className="divide-y divide-border">
                  {documents.data.map((document) => (
                    <DocumentRow key={document.id} document={document} compact />
                  ))}
                </ul>
              ) : (
                <EmptyState title="No documents linked" />
              )
            ) : (
              <ErrorState error={documents.error} />
            )}
          </Card>

          <Card>
            <CardHeader title="Linked vault entries" description="Metadata only." />
            {vault.ok ? (
              vault.data.length > 0 ? (
                <ul className="divide-y divide-border">
                  {vault.data.map((entry) => (
                    <VaultRow key={entry.id} entry={entry} compact />
                  ))}
                </ul>
              ) : (
                <EmptyState title="No vault entries linked" />
              )
            ) : (
              <ErrorState error={vault.error} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
