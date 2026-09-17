import { Scissors } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeepLink } from "@/components/deep-link";
import { Markdown } from "@/components/markdown";
import { stripSyncMarkers } from "@/components/records/document-row";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MetaList } from "@/components/ui/meta-list";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { load } from "@/lib/load";
import { readPositiveInt } from "@/lib/search-params";
import { getSystemOfRecord } from "@/lib/sor";

export async function generateMetadata({ params }: PageProps<"/documents/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Document #${id}` };
}

/**
 * Synced documents start with a YAML-ish front matter block. Show it as
 * metadata rather than as a wall of dashes at the top of the body.
 */
function splitFrontMatter(content: string): { frontMatter: Record<string, string> | null; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  if (!match) return { frontMatter: null, body: content };
  const frontMatter: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) frontMatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { frontMatter, body: content.slice(match[0].length) };
}

export default async function DocumentDetailPage({ params }: PageProps<"/documents/[id]">) {
  const { id: rawId } = await params;
  const id = readPositiveInt(rawId);
  if (!id) notFound();

  const sor = getSystemOfRecord();
  const document = await load(sor.getDocument(id));
  if (document.ok && !document.data) notFound();

  if (!document.ok) {
    return (
      <div className="space-y-6">
        <BackLink href="/documents">Documents</BackLink>
        <Card>
          <ErrorState error={document.error} />
        </Card>
      </div>
    );
  }

  const record = document.data!;
  const { frontMatter, body } = splitFrontMatter(stripSyncMarkers(record.content));

  return (
    <div className="space-y-6">
      <BackLink href="/documents">Documents</BackLink>

      <PageHeader
        eyebrow={<span className="font-mono normal-case">Document #{record.id}</span>}
        title={record.title}
        actions={<DeepLink href={sor.links.document(record.id)} label="Open in system of record" />}
      />

      <div className="flex flex-wrap items-center gap-2">
        {record.category ? <Badge>{record.category}</Badge> : null}
        {record.organizationId ? <Badge tone="neutral" className="font-mono">org #{record.organizationId}</Badge> : null}
        {!record.readFull ? (
          <Badge tone="warning">
            <Scissors className="size-3" aria-hidden />
            truncated by system of record
          </Badge>
        ) : null}
      </div>

      {frontMatter && Object.keys(frontMatter).length > 0 ? (
        <Card>
          <CardHeader title="Front matter" description="Metadata the sync tooling attached to this document." />
          <CardBody>
            <MetaList columns={3} items={Object.entries(frontMatter).map(([label, value]) => ({ label, value, mono: true }))} />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="px-6 py-6 sm:px-8 sm:py-8">
          {body.trim() ? <Markdown>{body}</Markdown> : <p className="text-sm text-fg-muted italic">This document is empty.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
