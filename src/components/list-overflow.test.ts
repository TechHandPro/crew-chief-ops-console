import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

function read(rel: string): string {
  return readFileSync(join(here, rel), "utf8");
}

describe("list views stay inside a 375px viewport", () => {
  it("clips page-level overflow on the document shell", () => {
    const css = read("../app/globals.css");
    expect(css).toMatch(/html\s*\{[^}]*overflow-x:\s*clip/);
    expect(css).toMatch(/body\s*\{[^}]*overflow-x:\s*clip/);
    expect(css).toMatch(/body\s*\{[^}]*max-width:\s*100%/);
  });

  it("pins the visual viewport to the device width", () => {
    const layout = read("../app/layout.tsx");
    expect(layout).toMatch(/width:\s*["']device-width["']/);
    expect(layout).toMatch(/initialScale:\s*1/);
  });

  it("contains the app shell and lets the mobile nav scroll inside itself", () => {
    const shell = read("shell/app-shell.tsx");
    expect(shell).toMatch(/overflow-x-clip/);
    expect(shell).toMatch(/min-w-0/);
    expect(shell).toMatch(/overflow-x-auto/);
    expect(shell).toMatch(/minmax\(0,\s*260px\)/);
    expect(shell).toMatch(/minmax\(0,\s*1fr\)/);

    const nav = read("shell/nav-link.tsx");
    expect(nav).toMatch(/shrink-0/);
    expect(nav).toMatch(/whitespace-nowrap/);
  });

  it("lets filter bars and segmented controls wrap instead of forcing a row", () => {
    const bar = read("ui/filter-bar.tsx");
    expect(bar).toMatch(/flex-wrap/);
    expect(bar).toMatch(/basis-full/);
    expect(bar).toMatch(/sm:basis-64/);
    expect(bar).toContain("max-w-full");
    expect(bar).toContain("min-w-0");
  });

  it("keeps list cards from imposing a table min-width", () => {
    const card = read("ui/card.tsx");
    expect(card).toMatch(/min-w-0/);
    expect(card).toMatch(/max-w-full/);
    expect(card).toMatch(/overflow-x-clip/);
  });

  it.each(["records/ticket-row.tsx", "records/document-row.tsx", "records/vault-row.tsx"] as const)(
    "%s stacks on narrow widths and can shrink",
    (file) => {
      const src = read(file);
      expect(src).toMatch(/RecordRow|flex-col/);
      expect(src).toMatch(/min-w-0/);
      expect(src).not.toMatch(/min-w-\[(?:[4-9]\d{2}|[1-9]\d{3})px\]/);
    },
  );

  it("shares a stacking row shell so id/time columns do not force a wide table", () => {
    const row = read("records/record-row.tsx");
    expect(row).toMatch(/flex-col/);
    expect(row).toMatch(/sm:flex-row/);
    expect(row).toMatch(/min-w-0/);
    expect(row).toMatch(/sm:contents/);
  });
});
