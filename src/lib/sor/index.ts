import { getConfig, type AppConfig } from "@/lib/config";

import { FixturesProvider } from "./fixtures/provider";
import type { SystemOfRecord } from "./provider";
import { TntMcpProvider } from "./tnt-mcp/provider";

export type { SystemOfRecord } from "./provider";
export { SystemOfRecordError } from "./provider";
export type * from "./types";

export function createSystemOfRecord(config: AppConfig): SystemOfRecord {
  switch (config.provider) {
    case "tnt-mcp": {
      if (!config.tnt) {
        throw new Error("TNT configuration missing for provider tnt-mcp.");
      }
      return new TntMcpProvider(config.tnt);
    }
    case "fixtures":
      return new FixturesProvider();
    default: {
      const exhaustive: never = config.provider;
      throw new Error(`Unknown provider: ${String(exhaustive)}`);
    }
  }
}

const globalForSor = globalThis as typeof globalThis & { __crewChiefSor?: SystemOfRecord };

/**
 * Process-wide provider instance. Stored on globalThis so Next.js dev-mode
 * module reloads reuse the same MCP session instead of leaking connections.
 */
export function getSystemOfRecord(): SystemOfRecord {
  if (!globalForSor.__crewChiefSor) {
    globalForSor.__crewChiefSor = createSystemOfRecord(getConfig());
  }
  return globalForSor.__crewChiefSor;
}
