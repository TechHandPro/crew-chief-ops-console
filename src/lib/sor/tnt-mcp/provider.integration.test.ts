import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import type { TntConfig } from "@/lib/config";

import { SystemOfRecordError } from "../provider";
import { TntMcpProvider } from "./provider";

/**
 * A stand-in for TNT's FastMCP endpoint: Bearer-gated Streamable HTTP with
 * the same tool names and JSON-in-text result convention. It also records
 * every tool call so tests can assert on routing arguments.
 */
class FakeTnt {
  readonly calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  private server: Server | null = null;
  private readonly transports = new Map<string, StreamableHTTPServerTransport>();
  private readonly listContextResolved = new Set<string>();
  private readonly deadSessions = new Set<string>();
  url = "";
  apiKey = "tnt_test_key";

  /** Simulate TNT restarting: every current session is forgotten. */
  async killSessions(): Promise<void> {
    for (const [id, transport] of this.transports) {
      this.deadSessions.add(id);
      this.listContextResolved.delete(id);
      await transport.close();
    }
    this.transports.clear();
  }

  async start(): Promise<void> {
    this.server = createServer((req, res) => void this.handle(req, res));
    await new Promise<void>((resolve) => this.server!.listen(0, "127.0.0.1", resolve));
    const { port } = this.server.address() as AddressInfo;
    this.url = `http://127.0.0.1:${port}/mcp`;
  }

  async stop(): Promise<void> {
    for (const transport of this.transports.values()) await transport.close();
    this.transports.clear();
    await new Promise<void>((resolve) => (this.server ? this.server.close(() => resolve()) : resolve()));
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.headers.authorization !== `Bearer ${this.apiKey}`) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Authentication required", success: false }));
      return;
    }

    const sessionId = req.headers["mcp-session-id"];
    if (typeof sessionId === "string") {
      const existing = this.transports.get(sessionId);
      if (existing) {
        await existing.handleRequest(req, res);
        return;
      }
      if (this.deadSessions.has(sessionId)) {
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: "Session not found" }, id: null }));
        return;
      }
    }

    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id: string) => {
        this.transports.set(id, transport);
      },
    });
    const server = this.buildServer(() => transport.sessionId ?? "");
    await server.connect(transport);
    await transport.handleRequest(req, res);
  }

  private buildServer(currentSession: () => string): McpServer {
    const server = new McpServer({ name: "fake-tnt", version: "0.0.0" });
    const reply = (payload: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(payload) }] });
    const record = (name: string, args: Record<string, unknown>) => this.calls.push({ name, args });
    const requireContext = () =>
      this.listContextResolved.has(currentSession())
        ? null
        : { success: false, error: "Repository context is required.", action_required: "resolve_repo" };

    server.registerTool(
      "tnt_resolve_repo",
      { inputSchema: { repo_slug: z.string().optional(), git_repository_id: z.number().optional(), organization_id: z.number().optional() } },
      async (args) => {
        record("tnt_resolve_repo", args);
        this.listContextResolved.add(currentSession());
        return reply({
          linked: true,
          organization_id: 1,
          organization_name: "Example Org",
          git_repository_id: 2,
          client_organization_id: 1,
          client_organization_name: "Example Org",
          work_ticket_id: 304,
        });
      },
    );

    server.registerTool(
      "tnt_list_tickets",
      { inputSchema: { limit: z.number().optional(), open_only: z.boolean().optional(), search: z.string().optional(), status: z.string().optional() } },
      async (args) => {
        record("tnt_list_tickets", args);
        const failure = requireContext();
        if (failure) return reply(failure);
        return reply({
          success: true,
          organization_id: 1,
          tickets: [
            { id: 320, title: "Ops Console v1", status: "In Progress", priority: "High", tags: "a,b", organization_id: 1 },
          ],
        });
      },
    );

    server.registerTool("tnt_get_ticket", { inputSchema: { ticket_id: z.number() } }, async (args) => {
      record("tnt_get_ticket", args);
      if (args.ticket_id === 404) return reply({ success: false, error: "Ticket not found" });
      return reply({
        success: true,
        ticket: { id: args.ticket_id, title: "Ops Console v1", status: "In Progress", description: "Body", comments: [] },
      });
    });

    server.registerTool(
      "tnt_list_documents",
      { inputSchema: { limit: z.number().optional(), search: z.string().optional(), ticket_id: z.number().optional() } },
      async (args) => {
        record("tnt_list_documents", args);
        const failure = requireContext();
        if (failure) return reply(failure);
        return reply({ success: true, documents: [{ id: 292, title: "Pin", category: "Documentation" }] });
      },
    );

    server.registerTool("tnt_get_document", { inputSchema: { doc_id: z.number(), max_chars: z.number().optional() } }, async (args) => {
      record("tnt_get_document", args);
      return reply({ success: true, document: { id: args.doc_id, title: "Pin", content: "# Pin", read_full: true } });
    });

    server.registerTool(
      "tnt_list_vault_entries",
      { inputSchema: { organization_id: z.number().optional(), ticket_id: z.number().optional() } },
      async (args) => {
        record("tnt_list_vault_entries", args);
        if (!args.organization_id) return reply({ success: false, error: "Pin organization_id on a cross-org key." });
        return reply({
          success: true,
          entries: [
            { id: 143, name: "Registrar API", category: "API", has_password: true, has_otp: false, ticket_ids: [272] },
          ],
        });
      },
    );

    return server;
  }
}

function configFor(fake: FakeTnt, overrides: Partial<TntConfig> = {}): TntConfig {
  return {
    mcpUrl: fake.url,
    apiKey: fake.apiKey,
    organizationId: 1,
    gitRepositoryId: 2,
    repoSlug: "Example/repo",
    webBaseUrl: "https://tnt.example.test",
    ticketUrlTemplate: "/tickets/{id}",
    documentUrlTemplate: "/documents/{id}/edit",
    vaultUrlTemplate: "/vault",
    cacheTtlMs: 0,
    ...overrides,
  };
}

describe("TntMcpProvider against a fake TNT MCP endpoint", () => {
  let fake: FakeTnt;

  beforeEach(async () => {
    fake = new FakeTnt();
    await fake.start();
  });

  afterEach(async () => {
    await fake.stop();
  });

  it("resolves the repo on connect, then lists and reads tickets", async () => {
    const provider = new TntMcpProvider(configFor(fake));

    const connection = await provider.getConnection();
    expect(connection).toMatchObject({ provider: "tnt-mcp", organizationId: 1, organizationName: "Example Org", readOnly: true });
    expect(fake.calls[0]).toMatchObject({
      name: "tnt_resolve_repo",
      args: { repo_slug: "Example/repo", git_repository_id: 2, organization_id: 1 },
    });

    const tickets = await provider.listTickets({ search: "console" });
    expect(tickets).toHaveLength(1);
    expect(tickets[0]).toMatchObject({ id: 320, tags: ["a", "b"] });
    expect(fake.calls.at(-1)).toMatchObject({ name: "tnt_list_tickets", args: { limit: 50, open_only: true, search: "console" } });

    const ticket = await provider.getTicket(320);
    expect(ticket?.description).toBe("Body");
    expect(await provider.getTicket(404)).toBeNull();
  });

  it("reads documents and pins the organization on vault listings", async () => {
    const provider = new TntMcpProvider(configFor(fake));

    const docs = await provider.listDocuments();
    expect(docs[0]).toMatchObject({ id: 292, title: "Pin" });

    const doc = await provider.getDocument(292);
    expect(doc).toMatchObject({ id: 292, content: "# Pin", readFull: true });
    expect(fake.calls.at(-1)).toMatchObject({ name: "tnt_get_document", args: { doc_id: 292, max_chars: 80000 } });

    const vault = await provider.listVaultEntries();
    expect(vault[0]).toMatchObject({ id: 143, hasPassword: true, ticketIds: [272] });
    expect(fake.calls.at(-1)).toMatchObject({ name: "tnt_list_vault_entries", args: { organization_id: 1 } });

    expect(await provider.getVaultEntry(143)).toMatchObject({ name: "Registrar API" });
    expect(await provider.getVaultEntry(999)).toBeNull();
  });

  it("surfaces a bad API key as an unauthorized error", async () => {
    const provider = new TntMcpProvider(configFor(fake, { apiKey: "wrong" }));

    const error = await provider.listTickets().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SystemOfRecordError);
    expect((error as SystemOfRecordError).kind).toBe("unauthorized");
  });

  it("re-resolves and retries when the server forgets the session", async () => {
    const provider = new TntMcpProvider(configFor(fake));
    await provider.listTickets();

    await fake.killSessions();
    const tickets = await provider.listTickets();

    expect(tickets).toHaveLength(1);
    const resolves = fake.calls.filter((call) => call.name === "tnt_resolve_repo");
    expect(resolves.length).toBeGreaterThanOrEqual(2);
  });

  it("never calls the vault reveal tool", async () => {
    const provider = new TntMcpProvider(configFor(fake));
    await provider.listVaultEntries();
    await provider.getVaultEntry(143);

    expect(fake.calls.map((call) => call.name)).not.toContain("tnt_get_vault_secret");
  });
});
