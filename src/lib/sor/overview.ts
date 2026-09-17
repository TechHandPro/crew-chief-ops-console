import { load, type Loaded } from "@/lib/load";

import type { SystemOfRecord } from "./provider";
import type { DocumentSummary, TicketSummary, VaultEntrySummary } from "./types";

/**
 * Queries the Overview page uses. Small limits + open tickets — the LIVE
 * path that still failed schema/read after the list-page unwrap (#340).
 */
export const OVERVIEW_TICKET_QUERY = { openOnly: true, limit: 8 } as const;
export const OVERVIEW_DOCUMENT_QUERY = { limit: 6 } as const;

export interface OverviewSummaries {
  tickets: Loaded<TicketSummary[]>;
  documents: Loaded<DocumentSummary[]>;
  vault: Loaded<VaultEntrySummary[]>;
}

/**
 * Load the three Overview widgets independently. One tool's schema/read
 * miss must not mask the others (`load()` per call, then `Promise.all`).
 */
export async function loadOverviewSummaries(sor: SystemOfRecord): Promise<OverviewSummaries> {
  const [tickets, documents, vault] = await Promise.all([
    load(sor.listTickets(OVERVIEW_TICKET_QUERY)),
    load(sor.listDocuments(OVERVIEW_DOCUMENT_QUERY)),
    load(sor.listVaultEntries()),
  ]);
  return { tickets, documents, vault };
}
