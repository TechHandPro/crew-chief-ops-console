import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { ConfigError, getConfig } from "@/lib/config";

/**
 * Request gate for the whole console.
 *
 * 1. Refuses to serve anything when configuration is invalid (fail closed).
 * 2. Redirects unauthenticated requests to the sign-in page when an access
 *    token is configured. Pages re-check inside the request as well.
 * 3. Applies a nonce-based Content Security Policy and hardening headers.
 */

const PUBLIC_PATHS = new Set(["/sign-in", "/api/health"]);

export async function proxy(request: NextRequest): Promise<NextResponse> {
  let config: ReturnType<typeof getConfig>;
  try {
    config = getConfig();
  } catch (error) {
    const message = error instanceof ConfigError ? error.message : "Server configuration error.";
    return withSecurityHeaders(
      NextResponse.json({ error: "configuration_error", message }, { status: 503 }),
      null,
      false,
    );
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (config.access.mode === "token" && !isPublic) {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(config.access.sessionSecret, cookie);
    if (!session) {
      const signIn = new URL("/sign-in", request.url);
      if (pathname !== "/") signIn.searchParams.set("next", pathname);
      const response = NextResponse.redirect(signIn);
      if (cookie) response.cookies.delete(SESSION_COOKIE_NAME);
      return withSecurityHeaders(response, null, false);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return withSecurityHeaders(response, nonce, config.nodeEnv === "development");
}

function buildCsp(nonce: string | null, isDev: boolean): string {
  const scriptSrc = nonce ? `'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}` : "'none'";
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function withSecurityHeaders(response: NextResponse, nonce: string | null, isDev: boolean): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce, isDev));
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cache-Control", "no-store");
  if (!isDev) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

// Prefetch requests are intentionally *not* excluded: they carry RSC payload
// for protected pages and must pass the same gate as a full navigation.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
