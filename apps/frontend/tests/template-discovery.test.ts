import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generatedTemplateModules } from "@/templates/generated-registry";
import { isTemplateAvailableForCreation, templateRegistry } from "@/templates/registry";

describe("safe build-time template discovery", () => {
  it("keeps the generated static registry synchronized with template packages", () => {
    expect(() => execFileSync(process.execPath, ["scripts/generate-template-registry.mjs", "--check"], { cwd: process.cwd(), stdio: "pipe" })).not.toThrow();
    expect(generatedTemplateModules.map((item) => item.manifest.key)).toEqual(["daztore-inv1", "elegant-gold", "minimal-white"]);
  });

  it("contains no template-specific imports in the hand-written registry", () => {
    const registry = readFileSync(join(process.cwd(), "src/templates/registry.ts"), "utf8");
    const generated = readFileSync(join(process.cwd(), "src/templates/generated-registry.ts"), "utf8");
    expect(registry).not.toMatch(/daztore-inv1|elegant-gold|minimal-white/);
    expect(generated).toMatch(/import \{ templateModule as /);
    expect(generated).not.toMatch(/import\s*\(|eval\s*\(|https?:\/\//);
  });

  it("offers only Daztore for new production invitations while retaining compatibility renderers", () => {
    expect(Object.keys(templateRegistry).sort()).toEqual(["daztore-inv1@1", "elegant-gold@1", "minimal-white@1"]);
    expect(isTemplateAvailableForCreation("daztore-inv1", 1)).toBe(true);
    expect(isTemplateAvailableForCreation("elegant-gold", 1)).toBe(false);
    expect(isTemplateAvailableForCreation("minimal-white", 1)).toBe(false);
  });
});
