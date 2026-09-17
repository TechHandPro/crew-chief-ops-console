import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";

import { decodeToolResult } from "./client";
import { parseTicketList } from "./schemas";

function toolResult(partial: { structuredContent?: Record<string, unknown>; text?: string }): CallToolResult {
  const content: CallToolResult["content"] = [];
  if (partial.text !== undefined) {
    content.push({ type: "text", text: partial.text });
  }
  return {
    content,
    ...(partial.structuredContent !== undefined ? { structuredContent: partial.structuredContent } : {}),
  };
}

const ticketList = { success: true as const, tickets: [] as const };

describe("decodeToolResult", () => {
  it("unwraps FastMCP structuredContent { result: T } so parseTicketList succeeds", () => {
    const payload = decodeToolResult(
      toolResult({
        structuredContent: { result: ticketList },
        text: JSON.stringify(ticketList),
      }),
    );

    expect(payload).toEqual(ticketList);
    expect(parseTicketList(payload)).toEqual([]);
  });

  it("keeps a flat structuredContent payload that already has success/tickets", () => {
    const payload = decodeToolResult(toolResult({ structuredContent: ticketList }));

    expect(payload).toEqual(ticketList);
    expect(parseTicketList(payload)).toEqual([]);
  });

  it("parses text-only JSON when structuredContent is absent", () => {
    const payload = decodeToolResult(toolResult({ text: JSON.stringify(ticketList) }));

    expect(payload).toEqual(ticketList);
    expect(parseTicketList(payload)).toEqual([]);
  });

  it("falls through to text JSON when structuredContent is empty", () => {
    const payload = decodeToolResult(
      toolResult({
        structuredContent: {},
        text: JSON.stringify(ticketList),
      }),
    );

    expect(payload).toEqual(ticketList);
    expect(parseTicketList(payload)).toEqual([]);
  });

  it("unwraps .result when the top level lacks expected fields but the nested object has them", () => {
    const payload = decodeToolResult(
      toolResult({
        structuredContent: { result: ticketList, extra: "ignore" },
      }),
    );

    expect(payload).toEqual(ticketList);
    expect(parseTicketList(payload)).toEqual([]);
  });

  it("unwraps { result: T, success: true } so Overview small-limit lists parse", () => {
    const openOnlyList = {
      success: true as const,
      organization_id: 1,
      open_only: true,
      tickets: [{ id: 1, title: "Open work", status: "In Progress" }],
    };

    const payload = decodeToolResult(
      toolResult({
        structuredContent: { result: openOnlyList, success: true },
        text: JSON.stringify(openOnlyList),
      }),
    );

    expect(payload).toEqual(openOnlyList);
    expect(parseTicketList(payload)).toEqual([
      expect.objectContaining({ id: 1, title: "Open work" }),
    ]);
  });

  it("falls back to text JSON when structuredContent is success-only (no arrays)", () => {
    const payload = decodeToolResult(
      toolResult({
        structuredContent: { success: true },
        text: JSON.stringify(ticketList),
      }),
    );

    expect(payload).toEqual(ticketList);
    expect(parseTicketList(payload)).toEqual([]);
  });

  it("unwraps a nested result wrapper twice", () => {
    const payload = decodeToolResult(
      toolResult({
        structuredContent: { result: { result: ticketList } },
      }),
    );

    expect(payload).toEqual(ticketList);
    expect(parseTicketList(payload)).toEqual([]);
  });

  it("unwraps a FastMCP-wrapped document and vault list the same way", () => {
    const documents = { success: true as const, documents: [{ id: 2, title: "Note" }] };
    const entries = { success: true as const, entries: [{ id: 3, name: "API" }] };

    expect(
      decodeToolResult(toolResult({ structuredContent: { result: documents, success: true } })),
    ).toEqual(documents);
    expect(
      decodeToolResult(toolResult({ structuredContent: { result: entries, success: true } })),
    ).toEqual(entries);
  });
});
