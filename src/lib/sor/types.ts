/**
 * Domain model for the Ops Console.
 *
 * These types are the console's own vocabulary. Providers (TNT MCP today,
 * other systems of record later) translate their wire formats into these
 * shapes, so the UI never depends on a vendor payload.
 *
 * Everything here is read-only by design: there are no mutation types.
 */

export type IsoDateTime = string;

export interface TicketSummary {
  id: number;
  title: string;
  status: string;
  priority: string | null;
  type: string | null;
  category: string | null;
  source: string | null;
  assignedTo: string | null;
  tags: string[];
  organizationId: number | null;
  createdAt: IsoDateTime | null;
  updatedAt: IsoDateTime | null;
}

export interface TicketComment {
  id: number;
  author: string | null;
  body: string;
  isInternal: boolean;
  createdAt: IsoDateTime | null;
}

export interface TicketDetail extends TicketSummary {
  description: string;
  comments: TicketComment[];
}

export interface DocumentSummary {
  id: number;
  title: string;
  category: string | null;
  visibility: string | null;
  ticketId: number | null;
  organizationId: number | null;
  isTemplate: boolean;
  createdBy: string | null;
  createdAt: IsoDateTime | null;
  updatedAt: IsoDateTime | null;
  bodyPreview: string | null;
}

export interface DocumentDetail {
  id: number;
  title: string;
  category: string | null;
  organizationId: number | null;
  content: string;
  /** False when the system of record truncated the body. */
  readFull: boolean;
}

export interface LinkedRecord {
  id: number;
  name: string;
}

/**
 * Vault entry *metadata*. There is deliberately no field for the secret
 * value; the console never requests it from the system of record.
 */
export interface VaultEntrySummary {
  id: number;
  name: string;
  username: string | null;
  category: string | null;
  url: string | null;
  notes: string | null;
  visibility: string | null;
  organizationId: number | null;
  createdBy: string | null;
  createdAt: IsoDateTime | null;
  updatedAt: IsoDateTime | null;
  hasPassword: boolean;
  hasOtp: boolean;
  ticketIds: number[];
  contact: LinkedRecord | null;
  asset: LinkedRecord | null;
  domain: LinkedRecord | null;
  network: LinkedRecord | null;
}

export interface TicketListQuery {
  search?: string;
  status?: string;
  openOnly?: boolean;
  limit?: number;
}

export interface DocumentListQuery {
  search?: string;
  category?: string;
  ticketId?: number;
  limit?: number;
}

export interface VaultListQuery {
  ticketId?: number;
}

export interface ConnectionInfo {
  /** Machine id of the provider, e.g. "tnt-mcp" or "fixtures". */
  provider: "tnt-mcp" | "fixtures";
  /** Human label for the system of record, e.g. "TNT". */
  systemName: string;
  /** Public web base URL of the system of record used for deep links. */
  webBaseUrl: string | null;
  organizationId: number | null;
  organizationName: string | null;
  /** Where reads come from, for the connection badge. */
  endpoint: string | null;
  readOnly: true;
}
