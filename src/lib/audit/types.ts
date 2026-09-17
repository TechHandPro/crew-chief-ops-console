/**
 * Console-local audit vocabulary. These types are for the fixtures preview
 * only — they are not a system-of-record contract and must not be added to
 * `SystemOfRecord` until Challenger unholds live audit wiring.
 */

import type { IsoDateTime } from "../sor/types";

export type AuditResourceKind = "ticket" | "document" | "vault";

export type AuditActionKind =
  | "ticket.created"
  | "ticket.updated"
  | "ticket.commented"
  | "document.created"
  | "document.updated"
  | "vault.created";

export interface AuditResource {
  kind: AuditResourceKind;
  id: number;
  /** Human label. Never a secret, hostname of a live SoR, or credential. */
  label: string;
}

export interface AuditEvent {
  id: string;
  occurredAt: IsoDateTime;
  actor: string | null;
  action: AuditActionKind;
  resource: AuditResource;
}

export interface AuditListQuery {
  search?: string;
}
