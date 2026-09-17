import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "./config";
import {
  FIXTURE_DOCUMENTS,
  FIXTURE_ID_MAX,
  FIXTURE_ID_MIN,
  FIXTURE_ORGANIZATION,
  FIXTURE_TICKETS,
  FIXTURE_VAULT,
} from "./sor/fixtures/data";

/**
 * TNT #338 public-pack deny-list (dry-run proof).
 *
 * Canonical written list: docs/public-pack.md
 *
 * This file is the automated check. It is not itself a public-pack surface,
 * so deny-list literals may appear here.
 */

const REPO_ROOT = join(import.meta.dirname, "../..");

/** Operator DNS assembled so this test is the only scanner that names it. */
const PRIVATE_OPERATOR_DNS = ["techhand", "pro"].join(".");

const PRIVATE_HOSTNAME_RE = new RegExp(
  `(^|[^a-z0-9-])([a-z0-9-]+\\.)?${PRIVATE_OPERATOR_DNS.replace(".", "\\.")}([^a-z0-9-]|$)`,
  "i",
);

const OPERATOR_LEGAL_NAME = ["TechHand", "Pro", "Solutions"].join(" ");

const SECRET_MATERIAL_RE =
  /-----BEGIN [A-Z0-9 ]+-----|\b(sk_live_|sk_test_|xox[baprs]-|EAAC[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,})/;

const FORBIDDEN_RECORD_KEYS = new Set([
  "password",
  "secret",
  "otp_secret",
  "otpSecret",
  "totp_secret",
  "totpSecret",
  "api_key",
  "apiKey",
  "access_token",
  "accessToken",
]);

const PUBLIC_PACK_FILES = collectPublicPackFiles();

function collectPublicPackFiles(): string[] {
  const files: string[] = [];
  const roots = [
    join(REPO_ROOT, "README.md"),
    join(REPO_ROOT, ".env.example"),
    join(REPO_ROOT, "src/lib/config.ts"),
    join(REPO_ROOT, "src/lib/sor/fixtures"),
    join(REPO_ROOT, "src/app"),
    join(REPO_ROOT, "src/components"),
    join(REPO_ROOT, "public"),
  ];

  function walk(path: string): void {
    if (!existsSync(path)) return;
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path)) {
        if (entry === "node_modules" || entry === ".git") continue;
        walk(join(path, entry));
      }
      return;
    }
    if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) return;
    files.push(path);
  }

  for (const root of roots) walk(root);
  return files.sort();
}

function repoPath(absolute: string): string {
  return relative(REPO_ROOT, absolute);
}

function walkRecords(value: unknown, visit: (record: Record<string, unknown>, path: string) => void, path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkRecords(item, visit, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    visit(record, path);
    for (const [key, child] of Object.entries(record)) {
      walkRecords(child, visit, `${path}.${key}`);
    }
  }
}

function collectIds(value: unknown): Array<{ id: number; path: string }> {
  const ids: Array<{ id: number; path: string }> = [];
  walkRecords(value, (record, path) => {
    if (typeof record.id === "number") {
      ids.push({ id: record.id, path });
    }
  });
  return ids;
}

function hostnameFromUrl(raw: string): string | null {
  try {
    return new URL(raw).hostname;
  } catch {
    if (raw.startsWith("ssh://")) {
      try {
        return new URL(raw.replace(/^ssh:\/\//, "https://")).hostname;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function isExampleHostname(hostname: string): boolean {
  return hostname === "example" || hostname.endsWith(".example") || hostname.endsWith(".example.test");
}

describe("public pack deny-list (TNT #338)", () => {
  it("scans the documented public-pack surfaces", () => {
    expect(PUBLIC_PACK_FILES.length).toBeGreaterThan(8);
    expect(PUBLIC_PACK_FILES.map(repoPath)).toEqual(
      expect.arrayContaining(["README.md", ".env.example", "src/lib/config.ts", "src/lib/sor/fixtures/data.ts"]),
    );
    expect(PUBLIC_PACK_FILES.map(repoPath)).not.toContain("docs/DEPLOY_OPS_CONSOLE.md");
    expect(PUBLIC_PACK_FILES.map(repoPath)).not.toContain("docs/public-pack.md");
  });

  it("ships the portable Deploy Ops Console skill under docs (TNT #338, cross #331)", () => {
    const skill = readFileSync(join(REPO_ROOT, "docs/DEPLOY_OPS_CONSOLE.md"), "utf8");
    for (const needle of [
      "avoid WSL2 as default",
      "Docker Desktop on Windows",
      "localhost port",
      "Windows hosts",
      "ops.local",
      "Caddy",
      "DNS checklist",
      "orange",
      "never chat",
      "Smoke",
      "/tickets",
      "/documents",
      "/vault",
      "Fail-closed",
      "TNT_MCP_URL",
      "#331",
    ]) {
      expect(skill, needle).toMatch(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    }
  });

  it("forbids private operator hostnames in public defaults, fixtures, README, and UI copy", () => {
    const hits: string[] = [];
    for (const file of PUBLIC_PACK_FILES) {
      const text = readFileSync(file, "utf8");
      if (PRIVATE_HOSTNAME_RE.test(text)) {
        hits.push(repoPath(file));
      }
    }
    expect(hits).toEqual([]);
  });

  it("forbids the operator legal name and vault secret material in the public pack", () => {
    const hits: string[] = [];
    for (const file of PUBLIC_PACK_FILES) {
      const text = readFileSync(file, "utf8");
      if (text.includes(OPERATOR_LEGAL_NAME) || SECRET_MATERIAL_RE.test(text)) {
        hits.push(repoPath(file));
      }
    }
    expect(hits).toEqual([]);
  });

  it("keeps fixture record ids in the fictional 9000–9999 band (no production vault/ticket paths)", () => {
    const ids = [
      ...collectIds(FIXTURE_TICKETS),
      ...collectIds(FIXTURE_DOCUMENTS),
      ...collectIds(FIXTURE_VAULT),
    ];
    expect(ids.length).toBeGreaterThan(10);
    for (const { id, path } of ids) {
      expect(id, path).toBeGreaterThanOrEqual(FIXTURE_ID_MIN);
      expect(id, path).toBeLessThanOrEqual(FIXTURE_ID_MAX);
    }
  });

  it("keeps fixture hosts on .example and fixture vault rows free of secret fields", () => {
    expect(FIXTURE_ORGANIZATION.name).toMatch(/\(demo\)/i);

    const secretFields: string[] = [];
    const badHosts: string[] = [];

    walkRecords([FIXTURE_TICKETS, FIXTURE_DOCUMENTS, FIXTURE_VAULT, FIXTURE_ORGANIZATION], (record, path) => {
      for (const key of Object.keys(record)) {
        if (FORBIDDEN_RECORD_KEYS.has(key)) {
          secretFields.push(`${path}.${key}`);
        }
      }
      for (const [key, value] of Object.entries(record)) {
        if (typeof value !== "string") continue;
        if (!/url|host|endpoint/i.test(key) && !/^https?:\/\//i.test(value) && !value.startsWith("ssh://")) {
          continue;
        }
        const hostname = hostnameFromUrl(value);
        if (hostname && !isExampleHostname(hostname)) {
          badHosts.push(`${path}.${key}=${hostname}`);
        }
      }
    });

    expect(secretFields).toEqual([]);
    expect(badHosts).toEqual([]);
  });

  it("does not default live TNT endpoints; fixtures-mode config has no private hostname", () => {
    const fixtures = loadConfig({ NODE_ENV: "development" });
    expect(fixtures.provider).toBe("fixtures");
    expect(fixtures.tnt).toBeNull();
    expect(JSON.stringify(fixtures)).not.toMatch(PRIVATE_HOSTNAME_RE);

    const base = {
      NODE_ENV: "production",
      SOR_PROVIDER: "tnt-mcp",
      TNT_MCP_API_KEY: "tnt_example_key_for_tests",
      TNT_ORGANIZATION_ID: "1",
      TNT_WEB_BASE_URL: "https://tnt.example.test",
      TNT_MCP_URL: "https://tnt.example.test/mcp",
      OPS_CONSOLE_ACCESS_TOKEN: "a-long-enough-operator-token-123",
      OPS_CONSOLE_SESSION_SECRET: "0123456789abcdef0123456789abcdef",
    };

    expect(() => {
      const { TNT_MCP_URL: _url, ...env } = base;
      loadConfig(env);
    }).toThrowError(/TNT_MCP_URL/);

    expect(() => {
      const { TNT_WEB_BASE_URL: _url, ...env } = base;
      loadConfig(env);
    }).toThrowError(/TNT_WEB_BASE_URL/);
  });
});
