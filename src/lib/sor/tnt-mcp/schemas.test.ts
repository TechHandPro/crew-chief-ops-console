import { describe, expect, it } from "vitest";

import {
  parseDocumentDetail,
  parseDocumentList,
  parseTicketDetail,
  parseTicketList,
  parseVaultList,
  TntToolError,
} from "./schemas";

const ticketRow = {
  id: 320,
  title: "CREW CHIEF Ops Console v1",
  status: "In Progress",
  priority: "High",
  type: "Incident",
  source: "grok-bot@example.test",
  category: "Feature",
  assigned_to: "grok-bot@example.test",
  tags: "crew-chief,ops-console,fable,product",
  organization_id: 1,
  updated_at: "2026-09-16T23:28:29.219742",
  created_at: "2026-09-16T23:27:53.816690",
};

describe("parseTicketList", () => {
  it("maps TNT rows into TicketSummary and splits tags", () => {
    const result = parseTicketList({
      success: true,
      organization_id: 1,
      open_only: true,
      tickets: [ticketRow],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 320,
      title: "CREW CHIEF Ops Console v1",
      status: "In Progress",
      priority: "High",
      assignedTo: "grok-bot@example.test",
      organizationId: 1,
      tags: ["crew-chief", "ops-console", "fable", "product"],
    });
  });

  it("tolerates null tags and missing optional fields", () => {
    const result = parseTicketList({
      success: true,
      tickets: [{ id: 1, title: "Bare", status: "Open", tags: null }],
    });

    expect(result[0]).toMatchObject({
      id: 1,
      tags: [],
      priority: null,
      assignedTo: null,
      createdAt: null,
    });
  });

  it("throws a TntToolError when the tool reports failure", () => {
    expect(() =>
      parseTicketList({
        success: false,
        error: "Repository context is required.",
        action_required: "resolve_repo",
      }),
    ).toThrowError(TntToolError);
  });

  it("treats a failure envelope without a success key as a tool failure, not a schema mismatch", () => {
    let caught: unknown;
    try {
      parseTicketList({
        error: "Repository TechHandPro/example is not linked to an organization.",
        action_required: "link_repo",
        hint: "Pass organization_id.",
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(TntToolError);
    expect((caught as TntToolError).message).toMatch(/not linked/);
    expect((caught as TntToolError).actionRequired).toBe("link_repo");
  });

  it("rejects a success envelope that lacks the tickets array", () => {
    expect(() => parseTicketList({ success: true, organization_id: 1 })).toThrowError(/tickets/);
  });

  it("does not mistake a record that merely has a null error field for a failure", () => {
    const result = parseTicketList({ success: true, error: null, tickets: [] });
    expect(result).toEqual([]);
  });

  it("accepts the Overview open_only + small-limit envelope without a success key", () => {
    const tickets = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      title: `Open work ${index + 1}`,
      status: "In Progress",
      tags: null,
    }));

    const result = parseTicketList({ organization_id: 1, open_only: true, tickets });
    expect(result).toHaveLength(8);
    expect(result[0]).toMatchObject({ id: 1, title: "Open work 1", tags: [] });
  });

  it("accepts a bare tickets array (FastMCP subset / fully unwrapped list)", () => {
    expect(parseTicketList([{ id: 1, title: "Bare" }])).toEqual([
      expect.objectContaining({ id: 1, title: "Bare", tags: [] }),
    ]);
  });
});

describe("parseTicketDetail", () => {
  it("includes description and comments", () => {
    const result = parseTicketDetail({
      success: true,
      organization_id: 1,
      ticket: {
        ...ticketRow,
        description: "## Goal\nBuild it.",
        comments: [
          {
            id: 1795,
            author: "grok-bot@example.test",
            body: "PRODUCT: repo confirmed",
            is_internal: true,
            created_at: "2026-09-16T23:28:23.213133",
          },
        ],
      },
    });

    expect(result.description).toBe("## Goal\nBuild it.");
    expect(result.comments).toEqual([
      {
        id: 1795,
        author: "grok-bot@example.test",
        body: "PRODUCT: repo confirmed",
        isInternal: true,
        createdAt: "2026-09-16T23:28:23.213133",
      },
    ]);
  });
});

describe("parseDocumentList", () => {
  it("maps list rows including body preview", () => {
    const result = parseDocumentList({
      success: true,
      organization_id: 1,
      documents: [
        {
          id: 292,
          title: "TNT Platform — Work Ticket Pin",
          category: "Documentation",
          visibility: "client",
          ticket_id: 35,
          organization_id: 1,
          is_template: false,
          worksheet_template_ids: [],
          created_by: "Cursor MCP",
          updated_at: "2026-08-14T01:02:08.453618",
          created_at: "2026-06-23T02:43:00.839080",
          ai_training_enabled: true,
          body_preview: "--- ticket_id: 35 ...",
        },
      ],
    });

    expect(result[0]).toMatchObject({
      id: 292,
      title: "TNT Platform — Work Ticket Pin",
      category: "Documentation",
      ticketId: 35,
      isTemplate: false,
      createdBy: "Cursor MCP",
      bodyPreview: "--- ticket_id: 35 ...",
    });
  });

  it("accepts search-result rows that lack list-only fields", () => {
    const result = parseDocumentList({
      success: true,
      documents: [
        {
          kind: "document",
          id: 690,
          organization_id: 1,
          title: "TNT — Mcp",
          category: "Documentation",
          visibility: "internal",
          ticket_id: 279,
          confidence_score: 1.0,
          body_preview: "...",
        },
      ],
    });

    expect(result[0]).toMatchObject({ id: 690, isTemplate: false, createdBy: null });
  });

  it("accepts the Overview small-limit envelope without a success key", () => {
    const documents = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      title: `Note ${index + 1}`,
    }));

    expect(parseDocumentList({ organization_id: 1, documents })).toHaveLength(6);
  });

  it("accepts a bare documents array", () => {
    expect(parseDocumentList([{ id: 1, title: "Bare" }])).toEqual([
      expect.objectContaining({ id: 1, title: "Bare" }),
    ]);
  });
});

describe("parseDocumentDetail", () => {
  it("maps content and read_full", () => {
    const result = parseDocumentDetail({
      success: true,
      organization_id: 1,
      document: {
        kind: "document",
        id: 292,
        title: "Pin",
        category: "Documentation",
        organization_id: 1,
        content: "# Pin\nbody",
        read_full: true,
      },
    });

    expect(result).toEqual({
      id: 292,
      title: "Pin",
      category: "Documentation",
      organizationId: 1,
      content: "# Pin\nbody",
      readFull: true,
    });
  });
});

describe("parseVaultList", () => {
  const entry = {
    id: 143,
    organization_id: 1,
    name: "Example Production API",
    username: "api-user",
    vendor_id: null,
    domain_id: null,
    category: "API",
    url: "https://api.example.test",
    notes: "Auth header documented in vendor console.",
    visibility: "internal",
    created_at: "2026-09-09T17:37:42.295783",
    updated_at: "2026-09-09T17:37:42.295784",
    created_by: "grok-bot@example.test",
    contact_id: null,
    asset_id: null,
    network_id: null,
    has_password: true,
    has_otp: false,
    otp_algorithm: "totp",
    contact: null,
    asset: null,
    domain: { id: 7, name: "ai.example.test" },
    network: null,
    ticket_ids: [272],
  };

  it("maps metadata and linked records", () => {
    const result = parseVaultList({ success: true, organization_id: 1, entries: [entry], total: 1 });

    expect(result[0]).toMatchObject({
      id: 143,
      name: "Example Production API",
      category: "API",
      hasPassword: true,
      hasOtp: false,
      ticketIds: [272],
      domain: { id: 7, name: "ai.example.test" },
      contact: null,
    });
  });

  it("refuses payloads that carry secret material", () => {
    expect(() =>
      parseVaultList({
        success: true,
        entries: [{ ...entry, password: "hunter2" }],
      }),
    ).toThrowError(/secret/i);

    expect(() =>
      parseVaultList({
        success: true,
        entries: [{ ...entry, otp_secret: "JBSWY3DP" }],
      }),
    ).toThrowError(/secret/i);
  });

  it("accepts a vault listing without a success key and a bare entries array", () => {
    expect(parseVaultList({ organization_id: 1, entries: [entry] })).toHaveLength(1);
    expect(parseVaultList([entry])).toEqual([expect.objectContaining({ id: 143, name: "Example Production API" })]);
  });
});
