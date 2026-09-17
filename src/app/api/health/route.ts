import { NextResponse } from "next/server";

import { ConfigError, getConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for deploys. Reports configuration validity and
 * which provider is active. It deliberately does not call the system of
 * record: a TNT outage should not flap the console's own health check.
 */
export function GET(): NextResponse {
  try {
    const config = getConfig();
    return NextResponse.json(
      {
        status: "ok",
        provider: config.provider,
        access: config.access.mode,
        readOnly: true,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof ConfigError ? error.message : "Server configuration error.";
    return NextResponse.json({ status: "misconfigured", message }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
