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
 *
 * ## Plugging in another system of record
 *
 * The console is a template: TNT is one adapter, the fixture dataset is
 * another. To connect a different MCP server (or any read API):
 *
 * 1. Create `src/lib/sor/<name>/provider.ts` exporting a class that
 *    implements this interface. Translate the wire format into the types in
 *    `./types.ts`; the UI never sees vendor payloads. Keep `links` built with
 *    `createDeepLinks` so records can hand off to the real system.
 * 2. Add `"<name>"` to `ProviderKind` in `src/lib/config.ts`, parse whatever
 *    environment the adapter needs there (fail closed on missing secrets),
 *    and return it on `AppConfig`.
 * 3. Add a `case "<name>"` to `createSystemOfRecord` in `./index.ts`. The
 *    switch is exhaustive, so the compiler lists every place to update.
 * 4. Mirror the guarantees in the adapter: allow-list the tools it may call,
 *    refuse payloads that carry secret material, and map failures to
 *    `SystemOfRecordError` so the shared UI can explain them.
 * 5. Cover it the way `tnt-mcp/provider.integration.test.ts` does: run the
 *    real client against a fake server that speaks the target's shapes.
 *
 * `ConnectionInfo.routing` describes how the adapter scopes reads to a
 * tenant (`organization`, `repository`, or `demo`), and `routingNote` lets it
 * explain a degraded mode to operators without leaking secrets.
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
