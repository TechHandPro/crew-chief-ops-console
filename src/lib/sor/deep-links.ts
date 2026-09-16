/**
 * Deep links from console records into the system of record's own web UI.
 *
 * Templates use `{id}` as the placeholder. A template may be a path (joined
 * onto the web base URL) or an absolute URL for records that live elsewhere.
 */

export interface DeepLinkTemplates {
  webBaseUrl: string;
  ticketUrlTemplate: string;
  documentUrlTemplate: string;
  vaultUrlTemplate: string;
}

export interface DeepLinks {
  ticket(id: number): string | null;
  document(id: number): string | null;
  vaultEntry(id: number): string | null;
  home(): string | null;
}

function expand(template: string, base: string, id: number): string {
  const filled = template.replaceAll("{id}", encodeURIComponent(String(id)));
  return new URL(filled, `${base}/`).toString();
}

export function createDeepLinks(templates: DeepLinkTemplates | null): DeepLinks {
  if (!templates) {
    return {
      ticket: () => null,
      document: () => null,
      vaultEntry: () => null,
      home: () => null,
    };
  }
  const base = templates.webBaseUrl.replace(/\/$/, "");
  return {
    ticket: (id) => expand(templates.ticketUrlTemplate, base, id),
    document: (id) => expand(templates.documentUrlTemplate, base, id),
    vaultEntry: (id) => expand(templates.vaultUrlTemplate, base, id),
    home: () => base,
  };
}
