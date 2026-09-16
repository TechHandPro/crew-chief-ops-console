import { describe, expect, it } from "vitest";

import { createDeepLinks } from "./deep-links";

describe("createDeepLinks", () => {
  const links = createDeepLinks({
    webBaseUrl: "https://tnt.example.test",
    ticketUrlTemplate: "/tickets/{id}",
    documentUrlTemplate: "/documents/{id}/edit",
    vaultUrlTemplate: "/vault",
  });

  it("builds absolute ticket and document URLs", () => {
    expect(links.ticket(320)).toBe("https://tnt.example.test/tickets/320");
    expect(links.document(292)).toBe("https://tnt.example.test/documents/292/edit");
  });

  it("supports templates without an id placeholder", () => {
    expect(links.vaultEntry(158)).toBe("https://tnt.example.test/vault");
  });

  it("supports absolute templates that point at another host", () => {
    const custom = createDeepLinks({
      webBaseUrl: "https://tnt.example.test",
      ticketUrlTemplate: "https://tracker.example.test/t/{id}",
      documentUrlTemplate: "/documents/{id}",
      vaultUrlTemplate: "/vault/{id}",
    });
    expect(custom.ticket(7)).toBe("https://tracker.example.test/t/7");
    expect(custom.vaultEntry(9)).toBe("https://tnt.example.test/vault/9");
  });

  it("returns null for every link when there is no base URL", () => {
    const none = createDeepLinks(null);
    expect(none.ticket(1)).toBeNull();
    expect(none.document(1)).toBeNull();
    expect(none.vaultEntry(1)).toBeNull();
  });
});
