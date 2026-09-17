import type { TntConfig } from "@/lib/config";

import { createDeepLinks, type DeepLinks } from "../deep-links";
import { memoKey, TtlMemo } from "../memo";
import { SystemOfRecordError, type SystemOfRecord } from "../provider";
import type {
  ConnectionInfo,
  DocumentDetail,
  DocumentListQuery,
  DocumentSummary,
  TicketDetail,
  TicketListQuery,
  TicketSummary,
  VaultEntrySummary,
  VaultListQuery,
} from "../types";
import { TntMcpClient } from "./client";
import {
  parseDocumentDetail,
  parseDocumentList,
  parseTicketDetail,
  parseTicketList,
  parseVaultList,
  TntToolError,
} from "./schemas";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;
const DOCUMENT_MAX_CHARS = 80_000;

/**
 * System-of-record adapter for TNT over its MCP endpoint.
 *
 * Reads only. Uses the same allow-listed tools an operator would call from
 * Cursor or Grok, authenticated with an organization API key.
 */
export class TntMcpProvider implements SystemOfRecord {
  readonly links: DeepLinks;
  private readonly memo: TtlMemo;

  constructor(
    private readonly config: TntConfig,
    private readonly client: TntMcpClient = new TntMcpClient({
      url: config.mcpUrl,
      apiKey: config.apiKey,
      repoSlug: config.repoSlug,
      gitRepositoryId: config.gitRepositoryId,
      organizationId: config.organizationId,
    }),
  ) {
    this.links = createDeepLinks({
      webBaseUrl: config.webBaseUrl,
      ticketUrlTemplate: config.ticketUrlTemplate,
      documentUrlTemplate: config.documentUrlTemplate,
      vaultUrlTemplate: config.vaultUrlTemplate,
    });
    this.memo = new TtlMemo(config.cacheTtlMs);
  }

  async getConnection(): Promise<ConnectionInfo> {
    await this.client.connect();
    const context = this.client.resolvedContext;
    return {
      provider: "tnt-mcp",
      systemName: this.config.systemName,
      webBaseUrl: this.config.webBaseUrl,
      organizationId: context?.organizationId ?? this.config.organizationId,
      organizationName: context?.organizationName ?? null,
      endpoint: this.config.mcpUrl,
      routing: context?.routing === "repository" ? "repository" : "organization",
      routingNote: context?.routingNote ?? null,
      readOnly: true,
    };
  }

  listTickets(query: TicketListQuery = {}): Promise<TicketSummary[]> {
    // Organization pin (TNT #316): listing works without a linked GitHub
    // repository or a prior tnt_resolve_repo, and never depends on
    // server-side session context that may have expired.
    const args: Record<string, unknown> = {
      organization_id: this.config.organizationId,
      limit: clampLimit(query.limit),
      open_only: query.openOnly ?? true,
    };
    if (query.search) args.search = query.search;
    if (query.status) args.status = query.status;

    return this.memo.get(memoKey({ tool: "tnt_list_tickets", ...args }), () =>
      asUpstream(this.client.callTool("tnt_list_tickets", args, parseTicketList)),
    );
  }

  getTicket(id: number): Promise<TicketDetail | null> {
    return this.memo.get(memoKey({ tool: "tnt_get_ticket", id }), () =>
      nullOnNotFound(this.client.callTool("tnt_get_ticket", { ticket_id: id }, parseTicketDetail)),
    );
  }

  listDocuments(query: DocumentListQuery = {}): Promise<DocumentSummary[]> {
    const args: Record<string, unknown> = {
      organization_id: this.config.organizationId,
      limit: clampLimit(query.limit),
    };
    if (query.search) args.search = query.search;
    if (query.category) args.category = query.category;
    if (query.ticketId) args.ticket_id = query.ticketId;

    return this.memo.get(memoKey({ tool: "tnt_list_documents", ...args }), () =>
      asUpstream(this.client.callTool("tnt_list_documents", args, parseDocumentList)),
    );
  }

  getDocument(id: number): Promise<DocumentDetail | null> {
    return this.memo.get(memoKey({ tool: "tnt_get_document", id }), () =>
      nullOnNotFound(
        this.client.callTool("tnt_get_document", { doc_id: id, max_chars: DOCUMENT_MAX_CHARS }, parseDocumentDetail),
      ),
    );
  }

  listVaultEntries(query: VaultListQuery = {}): Promise<VaultEntrySummary[]> {
    // The organization pin is mandatory: on a cross-org platform key TNT
    // refuses an unpinned vault listing, and we never want to list the
    // wrong tenant's metadata by accident.
    const args: Record<string, unknown> = { organization_id: this.config.organizationId };
    if (query.ticketId) args.ticket_id = query.ticketId;

    return this.memo.get(memoKey({ tool: "tnt_list_vault_entries", ...args }), () =>
      asUpstream(this.client.callTool("tnt_list_vault_entries", args, parseVaultList)),
    );
  }

  async getVaultEntry(id: number): Promise<VaultEntrySummary | null> {
    // TNT has no metadata-only single-entry read; the only per-entry tool is
    // the reveal, which this console must never call. Filter the listing.
    const entries = await this.listVaultEntries();
    return entries.find((entry) => entry.id === id) ?? null;
  }
}

function clampLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_LIST_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIST_LIMIT);
}

async function asUpstream<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof TntToolError) {
      throw new SystemOfRecordError("upstream", error.message, { cause: error });
    }
    throw error;
  }
}

async function nullOnNotFound<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof TntToolError && /not found|does not exist|no such/i.test(error.message)) {
      return null;
    }
    if (error instanceof TntToolError) {
      throw new SystemOfRecordError("upstream", error.message, { cause: error });
    }
    throw error;
  }
}
