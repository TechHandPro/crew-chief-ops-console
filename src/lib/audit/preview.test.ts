import { describe, expect, it } from "vitest";

import { FIXTURE_AUDIT_EVENTS } from "./fixtures";
import { AUDIT_DEMO_WEB_ORIGIN, auditDemoResourceHref, listAuditPreview } from "./preview";

const PRODUCTION_HOSTS = /techhand\.pro|ai\.techhand/i;

describe("listAuditPreview", () => {
  it("returns demo who/what rows covering ticket, document, and vault", () => {
    const events = listAuditPreview();

    expect(events.length).toBeGreaterThanOrEqual(6);
    expect(new Set(events.map((event) => event.resource.kind))).toEqual(new Set(["ticket", "document", "vault"]));

    for (const event of events) {
      expect(event.id).toMatch(/^audit-/);
      expect(event.occurredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(event.action.length).toBeGreaterThan(0);
      expect(event.resource.id).toBeGreaterThan(0);
      expect(event.resource.label.length).toBeGreaterThan(0);
    }

    expect(events.some((event) => event.actor)).toBe(true);
  });

  it("sorts newest first", () => {
    const times = listAuditPreview().map((event) => event.occurredAt);
    expect(times).toEqual([...times].sort((left, right) => right.localeCompare(left)));
  });

  it("filters by actor, action, or resource without a live system of record", () => {
    const byActor = listAuditPreview({ search: "crew-chief@" });
    expect(byActor.length).toBeGreaterThan(0);
    expect(byActor.every((event) => (event.actor ?? "").includes("crew-chief@"))).toBe(true);

    const byKind = listAuditPreview({ search: "vault" });
    expect(byKind.length).toBeGreaterThan(0);
    expect(
      byKind.every((event) =>
        `${event.action} ${event.resource.kind} ${event.resource.label}`.toLowerCase().includes("vault"),
      ),
    ).toBe(true);
  });

  it("keeps resource hrefs on the fixtures host and never on a production SoR", () => {
    expect(AUDIT_DEMO_WEB_ORIGIN).toBe("https://sor.example");

    for (const event of listAuditPreview()) {
      const href = auditDemoResourceHref(event.resource);
      expect(href).toEqual(expect.stringMatching(/^https:\/\/sor\.example\//));
      const url = new URL(href);
      expect(url.hostname).toBe("sor.example");
      expect(url.href).not.toMatch(PRODUCTION_HOSTS);
    }
  });

  it("does not embed secrets or vendor hostnames in fixture rows", () => {
    const blob = JSON.stringify(FIXTURE_AUDIT_EVENTS);
    expect(blob).not.toMatch(/password|otp[_-]?secret|api[_-]?key/i);
    expect(blob).not.toMatch(PRODUCTION_HOSTS);
    expect(blob).not.toMatch(/techhand/i);
  });
});
