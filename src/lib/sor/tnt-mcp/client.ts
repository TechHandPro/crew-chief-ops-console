import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";

import { SystemOfRecordError } from "../provider";
import { TntToolError } from "./schemas";

/**
 * The complete set of TNT MCP tools this console is allowed to call.
 * Everything is a read. `tnt_get_vault_secret` is deliberately absent and
 * the type system prevents adding a call to it without editing this list.
 */
export const READ_ONLY_TOOLS = [
  "tnt_resolve_repo",
  "tnt_list_tickets",
  "tnt_get_ticket",
  "tnt_list_documents",
  "tnt_get_document",
  "tnt_list_vault_entries",
] as const;

export type ReadOnlyTool = (typeof READ_ONLY_TOOLS)[number];

export interface TntMcpClientOptions {
  url: string;
  apiKey: string;
  /** Repo pin used to establish organization routing on connect. */
  repoSlug: string | null;
  gitRepositoryId: number | null;
  organizationId: number;
  requestTimeoutMs?: number;
  clientName?: string;
  clientVersion?: string;
}

/**
 * How ticket/document reads are routed to an organization.
 *
 * - `organization_pin`: every list call carries `organization_id` from
 *   configuration. Works without a linked GitHub repository (TNT #316).
 * - `repository`: a repo pin was configured *and* TNT confirmed the link, so
 *   the session also knows the repository and work ticket. List calls still
 *   carry `organization_id`; the extra context is informational.
 */
export type RoutingMode = "organization_pin" | "repository";

export interface ResolvedContext {
  routing: RoutingMode;
  /** Why routing fell back to the organization pin, when a repo pin was configured. */
  routingNote: string | null;
  organizationId: number;
  organizationName: string | null;
  gitRepositoryId: number | null;
  workTicketId: number | null;
}

const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Thin, connection-managing wrapper around the MCP SDK client.
 *
 * - Streamable HTTP transport with a Bearer org API key (the same header
 *   Cursor Desktop and Cursor Automations use against TNT).
 * - One lazily-opened session per process; reconnects once on transport loss.
 * - On connect, calls `tnt_resolve_repo` when a repo pin is configured. The
 *   result is informational: if the repository is not linked (or the resolve
 *   tool fails for a non-auth reason) the client continues with the
 *   configured organization pin instead of blocking every read.
 * - Tool calls are serialized. Overview `Promise.all`s three lists on a
 *   cold session; interleaved Streamable HTTP responses lose success+arrays.
 */
export class TntMcpClient {
  private readonly options: Required<Pick<TntMcpClientOptions, "requestTimeoutMs" | "clientName" | "clientVersion">> &
    TntMcpClientOptions;
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private connecting: Promise<void> | null = null;
  private context: ResolvedContext | null = null;
  private toolQueue: Promise<void> = Promise.resolve();

  constructor(options: TntMcpClientOptions) {
    this.options = {
      requestTimeoutMs: DEFAULT_TIMEOUT_MS,
      clientName: "crew-chief-ops-console",
      clientVersion: "0.1.0",
      ...options,
    };
  }

  /** Organization routing learned from `tnt_resolve_repo` (null before connect). */
  get resolvedContext(): ResolvedContext | null {
    return this.context;
  }

  async connect(): Promise<void> {
    // Wait for an in-flight handshake before treating `this.client` as ready.
    // Marking the client early let ConnectionBadge skip past resolve_repo and
    // race Overview list calls (TNT #340).
    if (this.connecting) return this.connecting;
    if (this.client) return;

    this.connecting = this.openSession().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  async close(): Promise<void> {
    const transport = this.transport;
    this.client = null;
    this.transport = null;
    this.context = null;
    if (transport) {
      await transport.close().catch(() => undefined);
    }
  }

  /**
   * Call one allow-listed read tool and parse its decoded JSON payload.
   * Retries once after re-establishing the session when the transport drops
   * or when TNT asks for repository context to be re-resolved (which happens
   * when the server-side session expired underneath us).
   */
  async callTool<T>(name: ReadOnlyTool, args: Record<string, unknown>, parse: (payload: unknown) => T): Promise<T> {
    return this.enqueueToolCall(async () => {
      try {
        return parseOrBadResponse(name, await this.callOnce(name, args), parse);
      } catch (error) {
        if (shouldRetryAfterReconnect(error)) {
          await this.close();
          return parseOrBadResponse(name, await this.callOnce(name, args), parse);
        }
        throw error;
      }
    });
  }

  private enqueueToolCall<T>(work: () => Promise<T>): Promise<T> {
    const run = this.toolQueue.then(work, work);
    this.toolQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async callOnce(name: ReadOnlyTool, args: Record<string, unknown>): Promise<unknown> {
    await this.connect();
    const client = this.client;
    if (!client) {
      throw new SystemOfRecordError("unreachable", "MCP session is not connected.");
    }
    return this.invokeOn(client, name, args);
  }

  private async invokeOn(client: Client, name: ReadOnlyTool, args: Record<string, unknown>): Promise<unknown> {
    let result: CallToolResult;
    try {
      result = (await client.callTool({ name, arguments: args }, undefined, {
        timeout: this.options.requestTimeoutMs,
      })) as CallToolResult;
    } catch (error) {
      throw translateTransportError(error);
    }

    const payload = decodeToolResult(result);
    if (result.isError) {
      const message = typeof payload === "string" ? payload : summarize(payload);
      throw new SystemOfRecordError("upstream", `TNT tool ${name} failed: ${message}`);
    }
    return payload;
  }

  private async openSession(): Promise<void> {
    const transport = new StreamableHTTPClientTransport(new URL(this.options.url), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
        },
      },
    });
    const client = new Client(
      { name: this.options.clientName, version: this.options.clientVersion },
      { capabilities: {} },
    );

    try {
      await client.connect(transport, { timeout: this.options.requestTimeoutMs });
    } catch (error) {
      await transport.close().catch(() => undefined);
      throw translateTransportError(error);
    }

    try {
      const context = await this.resolveContextOn(client);
      this.client = client;
      this.transport = transport;
      this.context = context;
    } catch (error) {
      await transport.close().catch(() => undefined);
      throw error;
    }
  }

  private async resolveContextOn(client: Client): Promise<ResolvedContext> {
    const { repoSlug, gitRepositoryId, organizationId } = this.options;
    const pinned: ResolvedContext = {
      routing: "organization_pin",
      routingNote: null,
      organizationId,
      organizationName: null,
      gitRepositoryId: null,
      workTicketId: null,
    };
    if (!repoSlug && !gitRepositoryId) {
      return pinned;
    }

    const args: Record<string, unknown> = { organization_id: organizationId };
    if (repoSlug) args.repo_slug = repoSlug;
    if (gitRepositoryId) args.git_repository_id = gitRepositoryId;

    let payload: unknown;
    try {
      payload = await this.invokeOn(client, "tnt_resolve_repo", args);
    } catch (error) {
      // Auth and transport failures would break every read, so surface them.
      // Anything else (missing scope, tool-level failure) must not block the
      // organization-pinned list path.
      if (error instanceof SystemOfRecordError && (error.kind === "unauthorized" || error.kind === "unreachable")) {
        throw error;
      }
      return { ...pinned, routingNote: `Repository routing unavailable (${describeError(error)}); using the organization pin.` };
    }

    const record = isRecord(payload) ? payload : {};
    const actionRequired = pickString(record, ["action_required"]);
    if (record.linked === false || record.success === false || actionRequired) {
      const detail = pickString(record, ["reason", "error", "message"]) ?? actionRequired ?? "repository is not linked";
      return {
        ...pinned,
        organizationName: pickString(record, ["home_organization_name", "primary_organization_name"]),
        routingNote: `Repository ${repoSlug ?? `#${gitRepositoryId}`} is not linked in the system of record (${detail}); using the organization pin.`,
      };
    }

    const resolvedOrganizationId = pickInt(record, ["client_organization_id", "target_organization_id", "organization_id"]);
    if (resolvedOrganizationId !== null && resolvedOrganizationId !== organizationId) {
      // Reads are pinned to the configured organization; a repository that
      // resolves elsewhere is a configuration mismatch worth showing, not a
      // reason to silently switch tenants.
      return {
        ...pinned,
        routingNote:
          `Repository ${repoSlug ?? `#${gitRepositoryId}`} resolves to organization #${resolvedOrganizationId}, ` +
          `but reads are pinned to organization #${organizationId}.`,
      };
    }

    return {
      routing: "repository",
      routingNote: null,
      organizationId,
      organizationName: pickString(record, ["client_organization_name", "organization_name", "home_organization_name"]),
      gitRepositoryId: pickInt(record, ["git_repository_id", "repo_id"]) ?? gitRepositoryId,
      workTicketId: pickInt(record, ["work_ticket_id"]),
    };
  }
}

function parseOrBadResponse<T>(name: ReadOnlyTool, payload: unknown, parse: (payload: unknown) => T): T {
  try {
    return parse(payload);
  } catch (error) {
    if (error instanceof TntToolError || error instanceof SystemOfRecordError) throw error;
    throw new SystemOfRecordError(
      "bad_response",
      `TNT tool ${name} returned a payload this console does not understand: ${describeError(error)}`,
      { cause: error },
    );
  }
}

function describeError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "$"}: ${issue.message}`)
      .join("; ");
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Fields that mean we have the actual tool body, not a FastMCP wrapper that
 * only echoed `success`. `success` alone is not enough — LIVE Overview misses
 * were `{ result: { success, tickets }, success: true }` (#340).
 */
const INNER_PAYLOAD_KEYS = ["tickets", "documents", "entries", "ticket", "document", "linked"] as const;

function hasInnerPayloadFields(value: Record<string, unknown>): boolean {
  return INNER_PAYLOAD_KEYS.some((key) => Object.hasOwn(value, key));
}

function isUsableToolPayload(value: unknown): boolean {
  if (Array.isArray(value)) return true;
  return isRecord(value) && hasInnerPayloadFields(value);
}

/**
 * FastMCP puts the tool return under `result`, sometimes with an extra
 * `success` (or `_meta`) sibling. Peel `.result` until we hit the inner
 * envelope (`tickets` / `documents` / `entries` / `linked`) or a bare array.
 */
function unwrapFastMcpStructuredContent(structured: Record<string, unknown>): unknown {
  let current: unknown = structured;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!isRecord(current) || !Object.hasOwn(current, "result")) {
      return current;
    }
    if (hasInnerPayloadFields(current)) {
      return current;
    }
    current = current.result;
  }
  return current;
}

function decodeTextContent(result: CallToolResult): unknown {
  const text = result.content
    .filter((block): block is Extract<CallToolResult["content"][number], { type: "text" }> => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * FastMCP returns tool output as a JSON string inside a text content block,
 * and newer servers add `structuredContent` — often wrapped as `{ result: T }`
 * and sometimes `{ result: T, success: true }`. Prefer an unwrapped structured
 * object that actually has the list/detail fields; otherwise fall back to the
 * text JSON (the #323 LIVE payload that already has success+arrays).
 */
export function decodeToolResult(result: CallToolResult): unknown {
  const textPayload = decodeTextContent(result);
  if (result.structuredContent && Object.keys(result.structuredContent).length > 0) {
    const unwrapped = unwrapFastMcpStructuredContent(result.structuredContent);
    if (isUsableToolPayload(unwrapped)) return unwrapped;
    if (isUsableToolPayload(textPayload)) return textPayload;
    return unwrapped;
  }
  return textPayload;
}

function translateTransportError(error: unknown): SystemOfRecordError {
  if (error instanceof SystemOfRecordError) return error;
  if (error instanceof UnauthorizedError) {
    return new SystemOfRecordError("unauthorized", "TNT rejected the MCP API key (401).", { cause: error });
  }
  if (error instanceof StreamableHTTPError) {
    if (error.code === 401) {
      return new SystemOfRecordError("unauthorized", "TNT rejected the MCP API key (401).", { cause: error });
    }
    if (error.code === 403) {
      return new SystemOfRecordError("forbidden", "The MCP API key lacks a required scope (403).", { cause: error });
    }
    return new SystemOfRecordError("unreachable", `TNT MCP endpoint returned HTTP ${error.code ?? "error"}.`, {
      cause: error,
    });
  }
  const message = error instanceof Error ? error.message : String(error);
  return new SystemOfRecordError("unreachable", `Could not reach the TNT MCP endpoint: ${message}`, { cause: error });
}

function shouldRetryAfterReconnect(error: unknown): boolean {
  if (error instanceof TntToolError) {
    return error.actionRequired === "resolve_repo";
  }
  if (error instanceof SystemOfRecordError) {
    return error.kind === "unreachable";
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickInt(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  }
  return null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function summarize(payload: unknown): string {
  if (isRecord(payload) && typeof payload.error === "string") return payload.error;
  try {
    return JSON.stringify(payload).slice(0, 300);
  } catch {
    return "unknown error";
  }
}
