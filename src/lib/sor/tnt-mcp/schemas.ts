import { z } from "zod";

import type {
  DocumentDetail,
  DocumentSummary,
  LinkedRecord,
  TicketComment,
  TicketDetail,
  TicketSummary,
  VaultEntrySummary,
} from "../types";

/**
 * Wire schemas for the TNT MCP tool results, mapped into the console's
 * domain model. Shapes were captured from live `tnt_list_tickets`,
 * `tnt_get_ticket`, `tnt_list_documents`, `tnt_get_document` and
 * `tnt_list_vault_entries` responses.
 *
 * Every object schema is loose: TNT adds fields over time and the console
 * must keep rendering. Only the fields we actually use are validated.
 */

export class TntToolError extends Error {
  readonly actionRequired: string | null;

  constructor(message: string, actionRequired: string | null = null) {
    super(message);
    this.name = "TntToolError";
    this.actionRequired = actionRequired;
  }
}

const nullableString = z.string().nullable().optional();
const nullableInt = z.number().int().nullable().optional();

/**
 * TNT failure envelopes come in two shapes: `{ success: false, error, … }`
 * from tool bodies, and `{ error, action_required, … }` without a `success`
 * key from routing guards. Both must surface as a tool failure with the
 * server's message rather than as a schema mismatch.
 */
const failureEnvelope = z.looseObject({
  success: z.boolean().optional(),
  error: z.string().nullable().optional(),
  action_required: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
});

function assertSuccess(input: unknown): void {
  const parsed = failureEnvelope.safeParse(input);
  if (!parsed.success) return;
  const { success, error, action_required, message } = parsed.data;
  const failed = success === false || (success !== true && (typeof error === "string" || typeof action_required === "string"));
  if (failed) {
    throw new TntToolError(error ?? message ?? "The system of record reported a failure.", action_required ?? null);
  }
}

const ticketRow = z.looseObject({
  id: z.number().int(),
  title: z.string(),
  status: z.string().nullable().optional(),
  priority: nullableString,
  type: nullableString,
  category: nullableString,
  source: nullableString,
  assigned_to: nullableString,
  tags: nullableString,
  organization_id: nullableInt,
  created_at: nullableString,
  updated_at: nullableString,
});

const commentRow = z.looseObject({
  id: z.number().int(),
  author: nullableString,
  body: z.string().nullable().optional(),
  is_internal: z.boolean().nullable().optional(),
  created_at: nullableString,
});

const ticketDetailRow = ticketRow.extend({
  description: z.string().nullable().optional(),
  comments: z.array(commentRow).nullable().optional(),
});

const ticketListEnvelope = z.looseObject({
  // Overview / FastMCP subset payloads sometimes omit `success` once the
  // tickets array is present (TNT #340). Failures still go through assertSuccess.
  success: z.literal(true).optional(),
  tickets: z.array(ticketRow),
});

const ticketDetailEnvelope = z.looseObject({
  success: z.literal(true),
  ticket: ticketDetailRow,
});

const documentRow = z.looseObject({
  id: z.number().int(),
  title: z.string(),
  category: nullableString,
  visibility: nullableString,
  ticket_id: nullableInt,
  organization_id: nullableInt,
  is_template: z.boolean().nullable().optional(),
  created_by: nullableString,
  created_at: nullableString,
  updated_at: nullableString,
  body_preview: nullableString,
});

const documentListEnvelope = z.looseObject({
  success: z.literal(true).optional(),
  documents: z.array(documentRow),
});

const documentDetailEnvelope = z.looseObject({
  success: z.literal(true),
  document: z.looseObject({
    id: z.number().int(),
    title: z.string(),
    category: nullableString,
    organization_id: nullableInt,
    content: z.string().nullable().optional(),
    read_full: z.boolean().nullable().optional(),
  }),
});

const linkedRecord = z
  .looseObject({ id: z.number().int(), name: z.string().nullable().optional() })
  .nullable()
  .optional();

/**
 * Keys that must never appear in a vault listing. TNT's list tool is
 * metadata-only by contract; if a payload ever carries one of these we
 * refuse to render it rather than risk showing a secret.
 */
const FORBIDDEN_VAULT_KEYS = new Set([
  "password",
  "secret",
  "otp_secret",
  "totp_secret",
  "private_key",
  "token",
]);

const vaultRow = z
  .looseObject({
    id: z.number().int(),
    name: z.string(),
    username: nullableString,
    category: nullableString,
    url: nullableString,
    notes: nullableString,
    visibility: nullableString,
    organization_id: nullableInt,
    created_by: nullableString,
    created_at: nullableString,
    updated_at: nullableString,
    has_password: z.boolean().nullable().optional(),
    has_otp: z.boolean().nullable().optional(),
    ticket_ids: z.array(z.number().int()).nullable().optional(),
    contact: linkedRecord,
    asset: linkedRecord,
    domain: linkedRecord,
    network: linkedRecord,
  })
  .check((ctx) => {
    for (const key of Object.keys(ctx.value)) {
      if (FORBIDDEN_VAULT_KEYS.has(key.toLowerCase())) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          message: `Vault listing unexpectedly contained secret field "${key}"; refusing to render.`,
        });
        return;
      }
    }
  });

const vaultListEnvelope = z.looseObject({
  success: z.literal(true).optional(),
  entries: z.array(vaultRow),
});

function splitTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function toTicketSummary(row: z.infer<typeof ticketRow>): TicketSummary {
  return {
    id: row.id,
    title: row.title,
    status: row.status ?? "Unknown",
    priority: row.priority ?? null,
    type: row.type ?? null,
    category: row.category ?? null,
    source: row.source ?? null,
    assignedTo: row.assigned_to ?? null,
    tags: splitTags(row.tags),
    organizationId: row.organization_id ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function toComment(row: z.infer<typeof commentRow>): TicketComment {
  return {
    id: row.id,
    author: row.author ?? null,
    body: row.body ?? "",
    isInternal: row.is_internal ?? false,
    createdAt: row.created_at ?? null,
  };
}

function toLinked(record: z.infer<typeof linkedRecord>): LinkedRecord | null {
  if (!record) return null;
  return { id: record.id, name: record.name ?? `#${record.id}` };
}

export function parseTicketList(input: unknown): TicketSummary[] {
  if (Array.isArray(input)) {
    return z.array(ticketRow).parse(input).map(toTicketSummary);
  }
  assertSuccess(input);
  return ticketListEnvelope.parse(input).tickets.map(toTicketSummary);
}

export function parseTicketDetail(input: unknown): TicketDetail {
  assertSuccess(input);
  const { ticket } = ticketDetailEnvelope.parse(input);
  return {
    ...toTicketSummary(ticket),
    description: ticket.description ?? "",
    comments: (ticket.comments ?? []).map(toComment),
  };
}

export function parseDocumentList(input: unknown): DocumentSummary[] {
  if (Array.isArray(input)) {
    return z.array(documentRow).parse(input).map(toDocumentSummary);
  }
  assertSuccess(input);
  return documentListEnvelope.parse(input).documents.map(toDocumentSummary);
}

function toDocumentSummary(row: z.infer<typeof documentRow>): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    category: row.category ?? null,
    visibility: row.visibility ?? null,
    ticketId: row.ticket_id ?? null,
    organizationId: row.organization_id ?? null,
    isTemplate: row.is_template ?? false,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    bodyPreview: row.body_preview ?? null,
  };
}

export function parseDocumentDetail(input: unknown): DocumentDetail {
  assertSuccess(input);
  const { document } = documentDetailEnvelope.parse(input);
  return {
    id: document.id,
    title: document.title,
    category: document.category ?? null,
    organizationId: document.organization_id ?? null,
    content: document.content ?? "",
    readFull: document.read_full ?? true,
  };
}

export function parseVaultList(input: unknown): VaultEntrySummary[] {
  if (Array.isArray(input)) {
    return z.array(vaultRow).parse(input).map(toVaultSummary);
  }
  assertSuccess(input);
  return vaultListEnvelope.parse(input).entries.map(toVaultSummary);
}

function toVaultSummary(row: z.infer<typeof vaultRow>): VaultEntrySummary {
  return {
    id: row.id,
    name: row.name,
    username: row.username ?? null,
    category: row.category ?? null,
    url: row.url ?? null,
    notes: row.notes ?? null,
    visibility: row.visibility ?? null,
    organizationId: row.organization_id ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    hasPassword: row.has_password ?? false,
    hasOtp: row.has_otp ?? false,
    ticketIds: row.ticket_ids ?? [],
    contact: toLinked(row.contact),
    asset: toLinked(row.asset),
    domain: toLinked(row.domain),
    network: toLinked(row.network),
  };
}
