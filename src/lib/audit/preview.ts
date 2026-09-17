import { createDeepLinks } from "../sor/deep-links";
import { FIXTURE_AUDIT_EVENTS } from "./fixtures";
import type { AuditActionKind, AuditEvent, AuditListQuery, AuditResource, AuditResourceKind } from "./types";

/**
 * Host used for *demo* resource hrefs. Matches the fixtures SoR. Never the
 * live web UI — production ticket/vault deep links stay held.
 */
export const AUDIT_DEMO_WEB_ORIGIN = "https://sor.example";

const DEMO_LINKS = createDeepLinks({
  webBaseUrl: AUDIT_DEMO_WEB_ORIGIN,
  ticketUrlTemplate: "/tickets/{id}",
  documentUrlTemplate: "/documents/{id}/edit",
  vaultUrlTemplate: "/vault",
});

export function auditActionLabel(action: AuditActionKind): string {
  switch (action) {
    case "ticket.created":
      return "Created ticket";
    case "ticket.updated":
      return "Updated ticket";
    case "ticket.commented":
      return "Commented on ticket";
    case "document.created":
      return "Created document";
    case "document.updated":
      return "Updated document";
    case "vault.created":
      return "Filed vault metadata";
    default: {
      const exhaustive: never = action;
      throw new Error(`Unknown audit action: ${String(exhaustive)}`);
    }
  }
}

export function auditResourceKindLabel(kind: AuditResourceKind): string {
  switch (kind) {
    case "ticket":
      return "Ticket";
    case "document":
      return "Document";
    case "vault":
      return "Vault";
    default: {
      const exhaustive: never = kind;
      throw new Error(`Unknown audit resource kind: ${String(exhaustive)}`);
    }
  }
}

/** Always the fixtures host. Callers must not swap this for live `DeepLinks`. */
export function auditDemoResourceHref(resource: AuditResource): string {
  switch (resource.kind) {
    case "ticket":
      return requireHref(DEMO_LINKS.ticket(resource.id), "ticket");
    case "document":
      return requireHref(DEMO_LINKS.document(resource.id), "document");
    case "vault":
      return requireHref(DEMO_LINKS.vaultEntry(resource.id), "vault");
    default: {
      const exhaustive: never = resource.kind;
      throw new Error(`Unknown audit resource kind: ${String(exhaustive)}`);
    }
  }
}

export function listAuditPreview(query: AuditListQuery = {}): AuditEvent[] {
  const needle = query.search?.trim().toLowerCase();
  return FIXTURE_AUDIT_EVENTS.filter((event) => {
    if (!needle) return true;
    const haystack = [
      event.actor ?? "",
      event.action,
      auditActionLabel(event.action),
      event.resource.kind,
      auditResourceKindLabel(event.resource.kind),
      String(event.resource.id),
      event.resource.label,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  }).sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function requireHref(href: string | null, kind: AuditResourceKind): string {
  if (!href) {
    throw new Error(`Demo ${kind} link is required for the fixtures audit preview.`);
  }
  return href;
}
