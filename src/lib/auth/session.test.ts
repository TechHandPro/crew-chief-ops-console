import { describe, expect, it } from "vitest";

import { createSessionToken, safeEqual, verifySessionToken } from "./session";

const secret = "0123456789abcdef0123456789abcdef";

describe("session tokens", () => {
  it("round-trips a freshly issued token", async () => {
    const token = await createSessionToken(secret, { ttlSeconds: 3600, now: 1_000_000 });
    const session = await verifySessionToken(secret, token, { now: 1_000_100 });

    expect(session).toEqual({ issuedAt: 1_000_000, expiresAt: 1_003_600 });
  });

  it("rejects an expired token", async () => {
    const token = await createSessionToken(secret, { ttlSeconds: 60, now: 1_000_000 });
    expect(await verifySessionToken(secret, token, { now: 1_000_061 })).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken("another-secret-that-is-long-enough!!", { ttlSeconds: 60, now: 1_000_000 });
    expect(await verifySessionToken(secret, token, { now: 1_000_001 })).toBeNull();
  });

  it("rejects tampered payloads and malformed tokens", async () => {
    const token = await createSessionToken(secret, { ttlSeconds: 60, now: 1_000_000 });
    const [payload, signature] = token.split(".");
    const tampered = `${payload.slice(0, -1)}${payload.at(-1) === "A" ? "B" : "A"}.${signature}`;

    expect(await verifySessionToken(secret, tampered, { now: 1_000_001 })).toBeNull();
    expect(await verifySessionToken(secret, "not-a-token", { now: 1_000_001 })).toBeNull();
    expect(await verifySessionToken(secret, "", { now: 1_000_001 })).toBeNull();
    expect(await verifySessionToken(secret, undefined, { now: 1_000_001 })).toBeNull();
  });
});

describe("safeEqual", () => {
  it("compares strings in constant time semantics", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});
