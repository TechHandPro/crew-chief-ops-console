import { describe, expect, it } from "vitest";

import { formatDateTime, formatRelative, initials, parseTimestamp, priorityTone, statusTone, truncate } from "./format";

describe("timestamps", () => {
  it("treats TNT's naive timestamps as UTC", () => {
    expect(parseTimestamp("2026-09-16T23:28:29.219742")?.toISOString()).toBe("2026-09-16T23:28:29.219Z");
    expect(parseTimestamp("2026-09-16T23:28:29Z")?.toISOString()).toBe("2026-09-16T23:28:29.000Z");
    expect(parseTimestamp("garbage")).toBeNull();
    expect(parseTimestamp(null)).toBeNull();
  });

  it("formats absolute and relative values", () => {
    expect(formatDateTime("2026-09-16T23:28:29")).toBe("Sep 16, 2026, 23:28 UTC");
    const now = new Date("2026-09-17T01:00:00Z");
    expect(formatRelative("2026-09-16T23:28:29", now)).toBe("2h ago");
    expect(formatRelative("2026-09-17T00:59:50", now)).toBe("just now");
    expect(formatRelative("2026-09-10T00:00:00", now)).toBe("7d ago");
    expect(formatRelative(null, now)).toBe("—");
  });
});

describe("tones", () => {
  it("maps ticket statuses to visual tones", () => {
    expect(statusTone("In Progress")).toBe("info");
    expect(statusTone("In-progress")).toBe("info");
    expect(statusTone("Waiting on Client")).toBe("warning");
    expect(statusTone("Resolved")).toBe("success");
    expect(statusTone("Closed")).toBe("success");
    expect(statusTone("Open")).toBe("accent");
  });

  it("maps priorities", () => {
    expect(priorityTone("Critical")).toBe("danger");
    expect(priorityTone("High")).toBe("warning");
    expect(priorityTone("Low")).toBe("neutral");
    expect(priorityTone(null)).toBe("neutral");
  });
});

describe("text helpers", () => {
  it("truncates on whitespace-normalized text", () => {
    expect(truncate("  a   very  long   sentence here ", 12)).toBe("a very long…");
    expect(truncate("short", 12)).toBe("short");
  });

  it("derives initials from emails and names", () => {
    expect(initials("grok-bot@example.test")).toBe("GB");
    expect(initials("Cursor MCP")).toBe("CM");
    expect(initials(null)).toBe("?");
  });
});
