import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getConfig } from "@/lib/config";

import { FailureLimiter } from "./rate-limit";
import { createSessionToken, safeEqual, SESSION_COOKIE_NAME, verifySessionToken, type Session } from "./session";

/**
 * Server-side access helpers. `proxy.ts` performs the optimistic redirect;
 * these run inside the request so every page and action re-checks the gate
 * rather than trusting the proxy alone.
 */

export type AccessState = { mode: "anonymous" } | { mode: "token"; session: Session | null };

const MAX_SIGN_IN_FAILURES = 5;
const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;

const globalForAuth = globalThis as typeof globalThis & { __crewChiefSignInLimiter?: FailureLimiter };

function limiter(): FailureLimiter {
  if (!globalForAuth.__crewChiefSignInLimiter) {
    globalForAuth.__crewChiefSignInLimiter = new FailureLimiter(MAX_SIGN_IN_FAILURES, SIGN_IN_WINDOW_MS);
  }
  return globalForAuth.__crewChiefSignInLimiter;
}

export async function getAccessState(): Promise<AccessState> {
  const { access } = getConfig();
  if (access.mode === "anonymous") return { mode: "anonymous" };

  const store = await cookies();
  const session = await verifySessionToken(access.sessionSecret, store.get(SESSION_COOKIE_NAME)?.value);
  return { mode: "token", session };
}

/** Redirects to the sign-in page unless the request is authorized. */
export async function requireAccess(): Promise<void> {
  const state = await getAccessState();
  if (state.mode === "token" && !state.session) {
    redirect("/sign-in");
  }
}

export type SignInResult = { ok: true } | { ok: false; reason: "invalid" | "rate_limited" | "not_configured" };

async function clientKey(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  return ip;
}

/**
 * Validates the presented access token and, on success, issues the session
 * cookie. Failures are counted per client address.
 */
export async function signInWithAccessToken(presented: string): Promise<SignInResult> {
  const { access, nodeEnv } = getConfig();
  if (access.mode !== "token") return { ok: false, reason: "not_configured" };

  const key = await clientKey();
  if (limiter().isBlocked(key)) return { ok: false, reason: "rate_limited" };

  if (!safeEqual(presented.trim(), access.accessToken)) {
    limiter().recordFailure(key);
    return { ok: false, reason: "invalid" };
  }
  limiter().reset(key);

  const token = await createSessionToken(access.sessionSecret, { ttlSeconds: access.sessionTtlSeconds });
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: nodeEnv === "production",
    path: "/",
    maxAge: access.sessionTtlSeconds,
  });
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
