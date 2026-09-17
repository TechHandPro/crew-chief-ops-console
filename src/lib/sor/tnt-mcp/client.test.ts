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
});
