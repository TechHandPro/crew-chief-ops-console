import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DeepLink } from "@/components/deep-link";
import { VaultRow } from "@/components/records/vault-row";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { load } from "@/lib/load";
import { readString, withParams } from "@/lib/search-params";
import { getSystemOfRecord } from "@/lib/sor";

export const metadata: Metadata = { title: "Vault" };

export default async function VaultPage({ searchParams }: PageProps<"/vault">) {
  const params = await searchParams;
  const query = readString(params, "q").toLowerCase();
  const category = readString(params, "category");

  const sor = getSystemOfRecord();
  const vault = await load(sor.listVaultEntries());

  const entries = vault.ok
    ? vault.data
        .filter((entry) => !category || (entry.category ?? "").toLowerCase() === category.toLowerCase())
        .filter(
          (entry) =>
            !query ||
            `${entry.id} ${entry.name} ${entry.username ?? ""} ${entry.url ?? ""} ${entry.category ?? ""}`
              .toLowerCase()
              .includes(query),
        )
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    : [];

  const categories = vault.ok
    ? [...new Set(vault.data.map((entry) => entry.category).filter((value): value is string => Boolean(value)))].sort()
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vault"
        title="Vault entries"
        description="Titles and metadata for credentials the crew recorded. This console has no reveal capability: secrets stay gated in the system of record."
        actions={<DeepLink href={sor.links.vaultIndex()} label="Open vault in system of record" />}
      />

      <div className="flex items-start gap-3 rounded-xl border border-success/20 bg-success-soft/60 px-4 py-3 text-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        <p className="text-fg-muted">
          <span className="font-medium text-fg">Metadata only.</span> The read tool this console uses returns names, categories,
          URLs, notes, and a has-secret flag. Passwords and OTP seeds are never requested, transmitted, or cached here.
        </p>
      </div>

      <FilterBar action="/vault" query={query} placeholder="Search names, usernames, hosts…" hidden={{ category: category || undefined }} />

      {categories.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {category ? (
            <Link href={withParams("/vault", { q: query || undefined })}>
              <Badge tone="accent">{category} ×</Badge>
            </Link>
          ) : (
            categories.map((value) => (
              <Link key={value} href={withParams("/vault", { q: query || undefined, category: value })}>
                <Badge tone="neutral">{value}</Badge>
              </Link>
            ))
          )}
        </div>
      ) : null}

      <Card>
        {vault.ok ? (
          entries.length > 0 ? (
            <ul className="divide-y divide-border">
              {entries.map((entry) => (
                <VaultRow key={entry.id} entry={entry} />
              ))}
            </ul>
          ) : (
            <EmptyState title={query || category ? "No entries match" : "The vault is empty"} />
          )
        ) : (
          <ErrorState error={vault.error} />
        )}
      </Card>
    </div>
  );
}
