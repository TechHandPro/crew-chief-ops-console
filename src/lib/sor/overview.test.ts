import { describe, expect, it, vi } from "vitest";

import { loadOverviewSummaries, OVERVIEW_DOCUMENT_QUERY, OVERVIEW_TICKET_QUERY } from "./overview";
import type { SystemOfRecord } from "./provider";
import type { DocumentSummary, TicketSummary, VaultEntrySummary } from "./types";

const ticket: TicketSummary = {
  id: 1,
  title: "Open work",
  status: "In Progress",
  priority: null,
  type: null,
  category: null,
  source: null,
  assignedTo: null,
  tags: [],
  organizationId: 1,
  createdAt: null,
  updatedAt: null,
};

const document: DocumentSummary = {
  id: 2,
  title: "Note",
  category: null,
  visibility: null,
  ticketId: null,
  organizationId: 1,
  isTemplate: false,
  createdBy: null,
  createdAt: null,
  updatedAt: null,
  bodyPreview: null,
};

const vault: VaultEntrySummary = {
  id: 3,
  name: "API",
  username: null,
  category: null,
  url: null,
  notes: null,
  visibility: null,
  organizationId: 1,
  createdBy: null,
  createdAt: null,
  updatedAt: null,
  hasPassword: true,
  hasOtp: false,
  ticketIds: [],
  contact: null,
  asset: null,
  domain: null,
  network: null,
};

describe("Overview summary queries", () => {
  it("pins open_only + the small widget limits", () => {
    expect(OVERVIEW_TICKET_QUERY).toEqual({ openOnly: true, limit: 8 });
    expect(OVERVIEW_DOCUMENT_QUERY).toEqual({ limit: 6 });
  });

  it("calls the same org-pinned list methods with those queries", async () => {
    const listTickets = vi.fn(async () => [ticket]);
    const listDocuments = vi.fn(async () => [document]);
    const listVaultEntries = vi.fn(async () => [vault]);
    const sor = { listTickets, listDocuments, listVaultEntries } as unknown as SystemOfRecord;

    const result = await loadOverviewSummaries(sor);

    expect(listTickets).toHaveBeenCalledWith(OVERVIEW_TICKET_QUERY);
    expect(listDocuments).toHaveBeenCalledWith(OVERVIEW_DOCUMENT_QUERY);
    expect(listVaultEntries).toHaveBeenCalledWith();
    expect(result.tickets).toEqual({ ok: true, data: [ticket] });
    expect(result.documents).toEqual({ ok: true, data: [document] });
    expect(result.vault).toEqual({ ok: true, data: [vault] });
  });

  it("keeps documents and vault when tickets fail schema/read", async () => {
    const sor = {
      listTickets: async () => {
        throw new Error("tickets: expected array, received undefined");
      },
      listDocuments: async () => [document],
      listVaultEntries: async () => [vault],
    } as unknown as SystemOfRecord;

    const result = await loadOverviewSummaries(sor);

    expect(result.tickets.ok).toBe(false);
    expect(result.documents).toEqual({ ok: true, data: [document] });
    expect(result.vault).toEqual({ ok: true, data: [vault] });
  });
});
