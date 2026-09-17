import type { AuditEvent } from "./types";

const ACTOR = {
  chief: "crew-chief@ops.example",
  product: "product-bot@ops.example",
  feature: "feature-bot@ops.example",
  manager: "crew-manager@ops.example",
  human: "jordan@northwind.example",
  cursor: "Cursor MCP",
};

/**
 * Fictional who/what rows for the `/audit` preview. Hosts, people, and
 * resources match the demo dataset — they do not exist in a live system of
 * record and must not deep-link to one.
 */
export const FIXTURE_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "audit-08",
    occurredAt: "2026-09-16T23:30:41Z",
    actor: ACTOR.chief,
    action: "ticket.commented",
    resource: { kind: "ticket", id: 320, label: "Ops Console v1 — read-only lists" },
  },
  {
    id: "audit-07",
    occurredAt: "2026-09-16T23:28:23Z",
    actor: ACTOR.product,
    action: "ticket.created",
    resource: { kind: "ticket", id: 320, label: "Ops Console v1 — read-only lists" },
  },
  {
    id: "audit-06",
    occurredAt: "2026-09-16T08:12:00Z",
    actor: ACTOR.cursor,
    action: "document.updated",
    resource: { kind: "document", id: 690, label: "MCP Tool Catalog" },
  },
  {
    id: "audit-05",
    occurredAt: "2026-09-15T18:40:00Z",
    actor: ACTOR.cursor,
    action: "document.updated",
    resource: { kind: "document", id: 691, label: "MCP Agent Workflow" },
  },
  {
    id: "audit-04",
    occurredAt: "2026-09-14T19:22:10Z",
    actor: ACTOR.manager,
    action: "ticket.commented",
    resource: { kind: "ticket", id: 304, label: "Import credential export CSV" },
  },
  {
    id: "audit-03",
    occurredAt: "2026-09-11T16:30:00Z",
    actor: ACTOR.feature,
    action: "ticket.updated",
    resource: { kind: "ticket", id: 279, label: "WHM migrate uploads" },
  },
  {
    id: "audit-02",
    occurredAt: "2026-09-11T15:15:17Z",
    actor: ACTOR.human,
    action: "vault.created",
    resource: { kind: "vault", id: 158, label: "Client hosting panel — admin" },
  },
  {
    id: "audit-01",
    occurredAt: "2026-09-09T17:37:42Z",
    actor: ACTOR.chief,
    action: "vault.created",
    resource: { kind: "vault", id: 143, label: "Registrar production API" },
  },
];
