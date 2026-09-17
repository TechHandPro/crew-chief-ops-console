import { ArrowRight, FileText, KeyRound, Ticket } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { DeepLink } from "@/components/deep-link";
import { DocumentRow } from "@/components/records/document-row";
import { TicketRow } from "@/components/records/ticket-row";
import { VaultRow } from "@/components/records/vault-row";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { isOpenStatus } from "@/lib/format";
import { load } from "@/lib/load";
import { getSystemOfRecord } from "@/lib/sor";

export default async function OverviewPage() {
  const sor = getSystemOfRecord();
  const [tickets, documents, vault] = await Promise.all([
    load(sor.listTickets({ limit: 8 })),
    load(sor.listDocuments({ limit: 6 })),
    load(sor.listVaultEntries()),
  ]);

  const openCount = tickets.ok ? tickets.data.filter((ticket) => isOpenStatus(ticket.status)).length : null;
  const vaultWithSecrets = vault.ok ? vault.data.filter((entry) => entry.hasPassword).length : null;
  const recentVault = vault.ok
    ? [...vault.data].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")).slice(0, 5)
    : [];

  return (
    <div className="min-w-0 space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="What the crew has been writing"
        description="Recent tickets, documents, and vault metadata from the connected system of record. Everything here is read-only; use the deep links to act."
        actions={<DeepLink href={sor.links.home()} label="Open system of record" />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          href="/tickets"
          icon={<Ticket className="size-4" aria-hidden />}
          label="Open tickets"
          value={openCount}
          detail={tickets.ok ? `${tickets.data.length} recent` : "unavailable"}
        />
        <StatCard
          href="/documents"
          icon={<FileText className="size-4" aria-hidden />}
          label="Recent documents"
          value={documents.ok ? documents.data.length : null}
          detail={documents.ok ? "latest updates" : "unavailable"}
        />
        <StatCard
          href="/vault"
          icon={<KeyRound className="size-4" aria-hidden />}
          label="Vault entries"
          value={vault.ok ? vault.data.length : null}
          detail={vaultWithSecrets !== null ? `${vaultWithSecrets} with stored secrets` : "unavailable"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Recent tickets"
            description="Open work, most recently updated first."
            action={<MoreLink href="/tickets">All tickets</MoreLink>}
          />
          {tickets.ok ? (
            tickets.data.length > 0 ? (
              <ul className="divide-y divide-border">
                {tickets.data.map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} compact />
                ))}
              </ul>
            ) : (
              <EmptyState title="No open tickets" description="Nothing is in flight right now." />
            )
          ) : (
            <ErrorState error={tickets.error} />
          )}
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title="Recent documents" action={<MoreLink href="/documents">All documents</MoreLink>} />
            {documents.ok ? (
              documents.data.length > 0 ? (
                <ul className="divide-y divide-border">
                  {documents.data.slice(0, 5).map((document) => (
                    <DocumentRow key={document.id} document={document} compact />
                  ))}
                </ul>
              ) : (
                <EmptyState title="No documents yet" />
              )
            ) : (
              <ErrorState error={documents.error} />
            )}
          </Card>

          <Card>
            <CardHeader
              title="Vault activity"
              description="Metadata only. Secrets stay in the vault."
              action={<MoreLink href="/vault">All entries</MoreLink>}
            />
            {vault.ok ? (
              recentVault.length > 0 ? (
                <ul className="divide-y divide-border">
                  {recentVault.map((entry) => (
                    <VaultRow key={entry.id} entry={entry} compact />
                  ))}
                </ul>
              ) : (
                <EmptyState title="Vault is empty" />
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

function StatCard({
  href,
  icon,
  label,
  value,
  detail,
}: {
  href: Route;
  icon: ReactNode;
  label: string;
  value: number | null;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-bg-elevated p-5 shadow-card transition hover:border-border-strong"
    >
      <div className="flex items-center justify-between text-fg-muted">
        <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
        <span className="text-fg-faint transition group-hover:text-accent">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-fg tabular-nums">{value ?? "—"}</div>
      <div className="mt-1 text-xs text-fg-muted">{detail}</div>
    </Link>
  );
}

function MoreLink({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted transition hover:text-accent">
      {children}
      <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}
