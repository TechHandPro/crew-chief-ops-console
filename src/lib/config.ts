import { createHash } from "node:crypto";

import { z } from "zod";

/**
 * Runtime configuration, parsed once from the environment.
 *
 * Secrets never leave the server: nothing here is prefixed NEXT_PUBLIC_ and
 * the client bundle never imports this module.
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export type ProviderKind = "tnt-mcp" | "fixtures";

export interface TntConfig {
  mcpUrl: string;
  apiKey: string;
  /** Tenant pin sent as `organization_id` on every list call. */
  organizationId: number;
  /** Optional repository pin; informational since lists are organization-pinned. */
  gitRepositoryId: number | null;
  repoSlug: string | null;
  /** Human label for the system of record in the connection badge. */
  systemName: string;
  webBaseUrl: string;
  ticketUrlTemplate: string;
  documentUrlTemplate: string;
  vaultUrlTemplate: string;
  /** Milliseconds to keep list/detail responses in the in-process cache. */
  cacheTtlMs: number;
}

export type AccessConfig =
  | { mode: "anonymous" }
  | {
      mode: "token";
      accessToken: string;
      sessionSecret: string;
      sessionTtlSeconds: number;
    };

export interface AppConfig {
  nodeEnv: "development" | "production" | "test";
  provider: ProviderKind;
  tnt: TntConfig | null;
  access: AccessConfig;
  /** Product name shown in the shell, sign-in page, and document titles. */
  brandName: string;
  /** Short line under the product name in the shell and on sign-in. */
  brandTagline: string;
}

/**
 * Generic defaults. The public template ships as "CREW CHIEF Ops Console";
 * a deployment re-labels itself through OPS_CONSOLE_BRAND_NAME /
 * OPS_CONSOLE_BRAND_TAGLINE only. Live adapter URLs have no default hostname
 * (TNT #338 — public pack vs dogfood).
 */
export const DEFAULT_BRAND_NAME = "CREW CHIEF Ops Console";
export const DEFAULT_BRAND_TAGLINE = "Audit what the crew writes";

const DEFAULT_TNT_SYSTEM_NAME = "TNT";
const MIN_SECRET_LENGTH = 16;
const MIN_SESSION_SECRET_LENGTH = 32;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SOR_PROVIDER: z.enum(["tnt-mcp", "fixtures"]).optional(),
  TNT_MCP_URL: z.string().trim().min(1).optional(),
  TNT_MCP_API_KEY: z.string().trim().min(1).optional(),
  TNT_ORGANIZATION_ID: z.coerce.number().int().positive().optional(),
  TNT_GIT_REPOSITORY_ID: z.coerce.number().int().positive().optional(),
  TNT_REPO_SLUG: z.string().trim().min(1).optional(),
  TNT_WEB_BASE_URL: z.string().trim().min(1).optional(),
  SOR_SYSTEM_NAME: z.string().trim().min(1).optional(),
  SOR_TICKET_URL_TEMPLATE: z.string().trim().min(1).default("/tickets/{id}"),
  SOR_DOCUMENT_URL_TEMPLATE: z.string().trim().min(1).default("/documents/{id}/edit"),
  SOR_VAULT_URL_TEMPLATE: z.string().trim().min(1).default("/vault"),
  SOR_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).max(3600).default(30),
  OPS_CONSOLE_ACCESS_TOKEN: z.string().trim().min(1).optional(),
  OPS_CONSOLE_SESSION_SECRET: z.string().trim().min(1).optional(),
  OPS_CONSOLE_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
  OPS_CONSOLE_ALLOW_ANONYMOUS: z.string().trim().optional(),
  OPS_CONSOLE_BRAND_NAME: z.string().trim().min(1).default(DEFAULT_BRAND_NAME),
  OPS_CONSOLE_BRAND_TAGLINE: z.string().trim().min(1).default(DEFAULT_BRAND_TAGLINE),
});

type RawEnv = Record<string, string | undefined>;

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true" || value?.toLowerCase() === "yes";
}

function assertHttpsOrLoopback(name: string, raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError(`${name} must be an absolute URL.`);
  }
  if (url.username || url.password) {
    throw new ConfigError(`${name} must not embed credentials.`);
  }
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "::1";
  if (url.protocol !== "https:" && !loopback) {
    throw new ConfigError(`${name} must use https (plain http is only allowed for loopback hosts).`);
  }
  return url.toString().replace(/\/$/, "");
}

function deriveDevSessionSecret(accessToken: string): string {
  // Development convenience only: production must supply its own secret so
  // that rotating the access token and invalidating sessions stay independent.
  return createHash("sha256").update(`crew-chief-ops-console:${accessToken}`).digest("hex");
}

function resolveAccess(env: z.infer<typeof envSchema>): AccessConfig {
  const production = env.NODE_ENV === "production";

  if (!env.OPS_CONSOLE_ACCESS_TOKEN) {
    if (production && !isTruthy(env.OPS_CONSOLE_ALLOW_ANONYMOUS)) {
      throw new ConfigError(
        "OPS_CONSOLE_ACCESS_TOKEN is required in production. The console exposes ticket contents and vault metadata; " +
          "set an access token, or set OPS_CONSOLE_ALLOW_ANONYMOUS=true only when an upstream identity-aware proxy already gates access.",
      );
    }
    return { mode: "anonymous" };
  }

  if (env.OPS_CONSOLE_ACCESS_TOKEN.length < MIN_SECRET_LENGTH) {
    throw new ConfigError(`OPS_CONSOLE_ACCESS_TOKEN must be at least ${MIN_SECRET_LENGTH} characters.`);
  }

  let sessionSecret = env.OPS_CONSOLE_SESSION_SECRET;
  if (!sessionSecret) {
    if (production) {
      throw new ConfigError(
        "OPS_CONSOLE_SESSION_SECRET is required in production when OPS_CONSOLE_ACCESS_TOKEN is set " +
          "(generate one with: openssl rand -hex 32).",
      );
    }
    sessionSecret = deriveDevSessionSecret(env.OPS_CONSOLE_ACCESS_TOKEN);
  }
  if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new ConfigError(`OPS_CONSOLE_SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters.`);
  }

  return {
    mode: "token",
    accessToken: env.OPS_CONSOLE_ACCESS_TOKEN,
    sessionSecret,
    sessionTtlSeconds: env.OPS_CONSOLE_SESSION_TTL_HOURS * 3600,
  };
}

function resolveTnt(env: z.infer<typeof envSchema>): TntConfig {
  if (!env.TNT_MCP_API_KEY) {
    throw new ConfigError("TNT_MCP_API_KEY is required when SOR_PROVIDER=tnt-mcp.");
  }
  if (!env.TNT_ORGANIZATION_ID) {
    throw new ConfigError(
      "TNT_ORGANIZATION_ID is required when SOR_PROVIDER=tnt-mcp (the organization pin for vault and cross-org keys).",
    );
  }
  if (!env.TNT_MCP_URL) {
    throw new ConfigError(
      "TNT_MCP_URL is required when SOR_PROVIDER=tnt-mcp. There is no default hostname; set the MCP endpoint for this deployment.",
    );
  }
  if (!env.TNT_WEB_BASE_URL) {
    throw new ConfigError(
      "TNT_WEB_BASE_URL is required when SOR_PROVIDER=tnt-mcp. There is no default hostname; set the web UI base for deep links.",
    );
  }
  return {
    mcpUrl: assertHttpsOrLoopback("TNT_MCP_URL", env.TNT_MCP_URL),
    apiKey: env.TNT_MCP_API_KEY,
    organizationId: env.TNT_ORGANIZATION_ID,
    gitRepositoryId: env.TNT_GIT_REPOSITORY_ID ?? null,
    repoSlug: env.TNT_REPO_SLUG ?? null,
    systemName: env.SOR_SYSTEM_NAME ?? DEFAULT_TNT_SYSTEM_NAME,
    webBaseUrl: assertHttpsOrLoopback("TNT_WEB_BASE_URL", env.TNT_WEB_BASE_URL),
    ticketUrlTemplate: env.SOR_TICKET_URL_TEMPLATE,
    documentUrlTemplate: env.SOR_DOCUMENT_URL_TEMPLATE,
    vaultUrlTemplate: env.SOR_VAULT_URL_TEMPLATE,
    cacheTtlMs: env.SOR_CACHE_TTL_SECONDS * 1000,
  };
}

export function loadConfig(raw: RawEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new ConfigError(`Invalid environment: ${detail}`);
  }
  const env = parsed.data;

  const provider: ProviderKind = env.SOR_PROVIDER ?? (env.TNT_MCP_API_KEY ? "tnt-mcp" : "fixtures");
  if (provider === "fixtures" && env.NODE_ENV === "production" && env.SOR_PROVIDER !== "fixtures") {
    throw new ConfigError(
      "No system of record configured for production. Set SOR_PROVIDER=tnt-mcp with TNT_MCP_API_KEY, " +
        "or set SOR_PROVIDER=fixtures explicitly to run the demo dataset.",
    );
  }

  return {
    nodeEnv: env.NODE_ENV,
    provider,
    tnt: provider === "tnt-mcp" ? resolveTnt(env) : null,
    access: resolveAccess(env),
    brandName: env.OPS_CONSOLE_BRAND_NAME,
    brandTagline: env.OPS_CONSOLE_BRAND_TAGLINE,
  };
}

let cached: AppConfig | null = null;

/** Process-wide configuration; parsed on first use so build steps stay env-free. */
export function getConfig(): AppConfig {
  if (!cached) {
    cached = loadConfig();
  }
  return cached;
}
