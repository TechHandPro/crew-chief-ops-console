import { EyeOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeepLink } from "@/components/deep-link";
import { SecretIndicators } from "@/components/records/vault-row";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MetaList } from "@/components/ui/meta-list";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { formatDateTime } from "@/lib/format";
import { load } from "@/lib/load";
import { readPositiveInt } from "@/lib/search-params";
import { getSystemOfRecord } from "@/lib/sor";

export async function generateMetadata({ params }: PageProps<"/vault/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Vault entry #${id}` };
}

export default async function VaultEntryPage({ params }: PageProps<"/vault/[id]">) {
  const { id: rawId } = await params;
  const id = readPositiveInt(rawId);
  if (!id) notFound();

  const sor = getSystemOfRecord();
  const entry = await load(sor.getVaultEntry(id));
  if (entry.ok && !entry.data) notFound();

  if (!entry.ok) {
    return (
      <div className="space-y-6">
        <BackLink href="/vault">Vault</BackLink>
        <Card>
          <ErrorState error={entry.error} />
        </Card>
      </div>
    );
  }

  const record = entry.data!;

  return (
    <div className="space-y-6">
      <BackLink href="/vault">Vault</BackLink>

      <PageHeader
        eyebrow={<span className="font-mono normal-case">Vault entry #{record.id}</span>}
        title={record.name}
        actions={<DeepLink href={sor.links.vaultEntry(record.id)} label="Open vault in system of record" />}
      />

      <div className="flex flex-wrap items-center gap-2">
        {record.category ? <Badge>{record.category}</Badge> : null}
        <SecretIndicators entry={record} />
        {record.visibility ? <Badge tone="neutral">{record.visibility}</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Metadata" />
            <CardBody>
              <MetaList
                items={[
                  { label: "Username", value: record.username, mono: true },
                  { label: "URL", value: record.url, mono: true },
                  { label: "Created by", value: record.createdBy },
                  { label: "Organization", value: record.organizationId ? `#${record.organizationId}` : null, mono: true },
                  { label: "Created", value: formatDateTime(record.createdAt) },
                  { label: "Updated", value: formatDateTime(record.updatedAt) },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Notes" description="Free-text notes recorded alongside the entry." />
            <CardBody>
              {record.notes?.trim() ? (
                <pre className="font-sans text-sm leading-relaxed whitespace-pre-wrap break-words text-fg">{record.notes}</pre>
              ) : (
                <p className="text-sm text-fg-muted italic">No notes.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Secret" />
            <CardBody>
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-bg-subtle text-fg-muted">
                  <EyeOff className="size-4" aria-hidden />
                </span>
                <div className="text-sm">
                  <p className="font-medium text-fg">
                    {record.hasPassword ? "Stored in the vault" : "No secret stored"}
                    {record.hasOtp ? " · OTP configured" : ""}
                  </p>
                  <p className="mt-1 text-fg-muted">
                    Reveal is a separate, audited action in the system of record. This console cannot perform it.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Linked records" />
            <CardBody>
              <MetaList
                columns={1}
                items={[
                  {
                    label: "Tickets",
                    value:
                      record.ticketIds.length > 0 ? (
                        <span className="flex flex-wrap gap-1.5">
                          {record.ticketIds.map((ticketId) => (
                            <Link key={ticketId} href={`/tickets/${ticketId}`} className="font-mono text-accent hover:underline">
                              #{ticketId}
                            </Link>
                          ))}
                        </span>
                      ) : null,
                  },
                  { label: "Contact", value: record.contact?.name },
                  { label: "Asset", value: record.asset?.name },
                  { label: "Domain", value: record.domain?.name, mono: true },
                  { label: "Network", value: record.network?.name },
                ]}
              />
              {!record.contact && !record.asset && !record.domain && !record.network && record.ticketIds.length === 0 ? (
                <p className="text-sm text-fg-muted italic">Not linked to any tickets, contacts, assets, domains, or networks.</p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
