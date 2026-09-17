import type { DeepLinks } from "./deep-links";
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
} from "./types";

/**
 * The read-only contract every system-of-record adapter implements.
 *
 * There is intentionally no method that creates, edits, or reveals anything.
 * Adding a write here is a product decision, not a refactor.
 */
export interface SystemOfRecord {
  readonly links: DeepLinks;

  /** Describes where reads come from; may perform a lightweight handshake. */
  getConnection(): Promise<ConnectionInfo>;

  listTickets(query?: TicketListQuery): Promise<TicketSummary[]>;
  getTicket(id: number): Promise<TicketDetail | null>;

  listDocuments(query?: DocumentListQuery): Promise<DocumentSummary[]>;
  getDocument(id: number): Promise<DocumentDetail | null>;

  listVaultEntries(query?: VaultListQuery): Promise<VaultEntrySummary[]>;
  getVaultEntry(id: number): Promise<VaultEntrySummary | null>;
}

/** Raised when the system of record cannot be reached or rejects the request. */
export class SystemOfRecordError extends Error {
  readonly kind: "unreachable" | "unauthorized" | "forbidden" | "bad_response" | "upstream";

  constructor(kind: SystemOfRecordError["kind"], message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SystemOfRecordError";
    this.kind = kind;
  }
}
