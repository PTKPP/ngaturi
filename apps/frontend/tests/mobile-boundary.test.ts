import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const globals = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const templates = join(process.cwd(), "src/templates");

describe.each([360, 390])("mobile boundary at %ipx", (width) => {
  it("uses a clipped page boundary, zero-minimum grid items, touch targets, and safe areas", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
    expect(globals).toMatch(/html, body[^}]*max-width: 100%[^}]*overflow-x: clip/);
    expect(globals).toMatch(/button, \.button, input, select[^}]*min-height: 44px/);
    expect(globals).toMatch(/safe-area-inset-bottom/);
    expect(globals).toMatch(/\.form\.two-column \{ grid-template-columns:[^}]+\}/);
    expect(globals.indexOf("@media (min-width: 40rem)")).toBeGreaterThan(globals.indexOf(".form {"));
  });

  it("does not use viewport-fixed minimum widths in renderer styles", () => {
    const css = readdirSync(templates, { withFileTypes: true }).filter((entry) => entry.isDirectory() && /^\w[\w-]+$/.test(entry.name)).flatMap((entry) => {
      const path = join(templates, entry.name, "styles.module.css");
      try { return [readFileSync(path, "utf8")]; } catch { return []; }
    }).join("\n");
    expect(css).not.toMatch(/min-width:\s*(?:[4-9]\d{2}|\d{4,})px/);
  });
});
