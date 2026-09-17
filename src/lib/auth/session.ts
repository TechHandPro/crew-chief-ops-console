/**
 * Stateless, HMAC-signed session tokens for the console access gate.
 *
 * Uses Web Crypto only, so the same code runs in `proxy.ts`, server
 * components, and server actions. Tokens carry no identity beyond "someone
 * presented the operator access token at this time"; that is all a v1
 * shared-secret gate needs, and there is nothing sensitive to leak.
 */

export const SESSION_COOKIE_NAME = "cc_ops_session";
const TOKEN_VERSION = 1;

export interface Session {
  issuedAt: number;
  expiresAt: number;
}

interface Payload {
  v: number;
  iat: number;
  exp: number;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const padded = text.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function sign(secret: string, message: string): Promise<Uint8Array> {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(message));
  return new Uint8Array(signature);
}

export async function createSessionToken(
  secret: string,
  options: { ttlSeconds: number; now?: number },
): Promise<string> {
  const iat = Math.floor((options.now ?? Date.now() / 1000));
  const payload: Payload = { v: TOKEN_VERSION, iat, exp: iat + options.ttlSeconds };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = toBase64Url(await sign(secret, encodedPayload));
  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(
  secret: string,
  token: string | undefined,
  options: { now?: number } = {},
): Promise<Session | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, encodedSignature] = parts;

  const presented = fromBase64Url(encodedSignature);
  if (!presented) return null;
  const expected = await sign(secret, encodedPayload);
  if (!safeEqualBytes(presented, expected)) return null;

  const payloadBytes = fromBase64Url(encodedPayload);
  if (!payloadBytes) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return null;
  }
  if (!isPayload(payload) || payload.v !== TOKEN_VERSION) return null;

  const now = Math.floor(options.now ?? Date.now() / 1000);
  if (payload.exp <= now || payload.iat > now + 60) return null;

  return { issuedAt: payload.iat, expiresAt: payload.exp };
}

function isPayload(value: unknown): value is Payload {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.v === "number" && typeof record.iat === "number" && typeof record.exp === "number";
}

function safeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Constant-time string comparison for the operator access token. */
export function safeEqual(a: string, b: string): boolean {
  return safeEqualBytes(encoder.encode(a), encoder.encode(b));
}
