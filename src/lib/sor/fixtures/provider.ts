import { createDeepLinks, type DeepLinks } from "../deep-links";
import type { SystemOfRecord } from "../provider";
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
import { FIXTURE_DOCUMENTS, FIXTURE_ORGANIZATION, FIXTURE_TICKETS, FIXTURE_VAULT, toDocumentSummary } from "./data";

const CLOSED_STATUSES = new Set(["resolved", "closed", "done", "cancelled", "canceled"]);
const DEMO_WEB_BASE_URL = "https://sor.example";

/**
 * In-memory system of record backed by the fixture dataset. Lets anyone run
 * the console without credentials and gives the UI deterministic data.
 */
export class FixturesProvider implements SystemOfRecord {
  readonly links: DeepLinks = createDeepLinks({
    webBaseUrl: DEMO_WEB_BASE_URL,
    ticketUrlTemplate: "/tickets/{id}",
    documentUrlTemplate: "/documents/{id}/edit",
    vaultUrlTemplate: "/vault",
  });

  async getConnection(): Promise<ConnectionInfo> {
    return {
      provider: "fixtures",
      systemName: "Demo dataset",
      webBaseUrl: DEMO_WEB_BASE_URL,
      organizationId: FIXTURE_ORGANIZATION.id,
      organizationName: FIXTURE_ORGANIZATION.name,
      endpoint: null,
      routing: "demo",
      routingNote: null,
      readOnly: true,
    };
  }

  async listTickets(query: TicketListQuery = {}): Promise<TicketSummary[]> {
    const openOnly = query.openOnly ?? true;
    const needle = query.search?.trim().toLowerCase();
    const status = query.status?.trim().toLowerCase();

    return FIXTURE_TICKETS.filter((ticket) => {
      if (openOnly && CLOSED_STATUSES.has(ticket.status.toLowerCase())) return false;
      if (status && ticket.status.toLowerCase() !== status) return false;
      if (needle && !`${ticket.id} ${ticket.title} ${ticket.tags.join(" ")}`.toLowerCase().includes(needle)) return false;
      return true;
    })
      .slice(0, query.limit ?? 50)
      .map(stripDetail);
  }

  async getTicket(id: number): Promise<TicketDetail | null> {
    return FIXTURE_TICKETS.find((ticket) => ticket.id === id) ?? null;
  }

  async listDocuments(query: DocumentListQuery = {}): Promise<DocumentSummary[]> {
    const needle = query.search?.trim().toLowerCase();
    const category = query.category?.trim().toLowerCase();

    return FIXTURE_DOCUMENTS.map(toDocumentSummary)
      .filter((doc) => {
        if (query.ticketId && doc.ticketId !== query.ticketId) return false;
        if (category && doc.category?.toLowerCase() !== category) return false;
        if (needle && !`${doc.id} ${doc.title} ${doc.bodyPreview ?? ""}`.toLowerCase().includes(needle)) return false;
        return true;
      })
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
      .slice(0, query.limit ?? 50);
  }

  async getDocument(id: number): Promise<DocumentDetail | null> {
    return FIXTURE_DOCUMENTS.find((doc) => doc.id === id) ?? null;
  }

  async listVaultEntries(query: VaultListQuery = {}): Promise<VaultEntrySummary[]> {
    return FIXTURE_VAULT.filter((entry) => !query.ticketId || entry.ticketIds.includes(query.ticketId));
  }

  async getVaultEntry(id: number): Promise<VaultEntrySummary | null> {
    return FIXTURE_VAULT.find((entry) => entry.id === id) ?? null;
  }
}

function stripDetail(ticket: TicketDetail): TicketSummary {
  const { description: _description, comments: _comments, ...summary } = ticket;
  return summary;
}
