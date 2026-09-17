import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { READ_ONLY_TOOLS } from "@/lib/sor/tnt-mcp/client";

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(here, rel), "utf8");
}

/**
 * TNT #331 / Challenger #332/#336: ship the fixtures audit page only.
 * Live SoR audit reads and production ticket/vault deep links stay held.
 */
describe("live audit wiring is held", () => {
  it("does not add audit or activity tools to the TNT allow-list", () => {
    expect(READ_ONLY_TOOLS).toEqual([
      "tnt_resolve_repo",
      "tnt_list_tickets",
      "tnt_get_ticket",
      "tnt_list_documents",
      "tnt_get_document",
      "tnt_list_vault_entries",
    ]);
    expect(READ_ONLY_TOOLS.join(",")).not.toMatch(/audit|activity|history/i);
  });

  it("does not extend SystemOfRecord with a live audit read", () => {
    const src = read("../sor/provider.ts");
    expect(src).not.toMatch(/listAudit|listActivity|getAudit/);
  });

  it("serves /audit from the fixtures preview and never the live provider", () => {
    const page = read("../../app/(console)/audit/page.tsx");
    expect(page).toMatch(/listAuditPreview/);
    expect(page).not.toMatch(/from ["']@\/lib\/sor["']/);
    expect(page).not.toMatch(/getSystemOfRecord\(/);
    expect(page).not.toMatch(/tnt-mcp|TNT_WEB_BASE_URL|sor\.links/);
  });

  it("does not publish /audit as an unauthenticated path", () => {
    const proxy = read("../../proxy.ts");
    expect(proxy).toContain('PUBLIC_PATHS = new Set(["/sign-in", "/api/health"])');
    expect(proxy).not.toMatch(/\/audit/);
  });

  it("keeps the console layout as the access gate", () => {
    const layout = read("../../app/(console)/layout.tsx");
    expect(layout).toMatch(/requireAccess/);
  });

  it("does not send audit rows to live console ticket or vault routes", () => {
    const row = read("../../components/records/audit-row.tsx");
    expect(row).toMatch(/auditDemoResourceHref/);
    expect(row).not.toMatch(/href=\{?[`'"]\/(tickets|documents|vault)/);
    expect(row).not.toMatch(/getSystemOfRecord\(/);
  });

  it("adds an Audit nav entry", () => {
    const shell = read("../../components/shell/app-shell.tsx");
    expect(shell).toMatch(/href: "\/audit"/);
    expect(shell).toMatch(/label: "Audit"/);
  });
});
