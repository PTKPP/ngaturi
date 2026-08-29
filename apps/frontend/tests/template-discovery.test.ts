import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generatedTemplateModules } from "@/templates/generated-registry";
import { isTemplateAvailableForCreation, templateRegistry } from "@/templates/registry";
import { templateModule as fixtureTemplateModule } from "./fixtures/templates/plug-and-play-fixture";

describe("safe build-time template discovery", () => {
  it("keeps the generated static registry synchronized with template packages", () => {
    expect(() => execFileSync(process.execPath, ["scripts/generate-template-registry.mjs", "--check"], { cwd: process.cwd(), stdio: "pipe" })).not.toThrow();
    expect(generatedTemplateModules.map((item) => item.manifest.key)).toEqual(["elegant-gold", "minimal-white", "wedding-default"]);
  });

  it("contains no template-specific imports in the hand-written registry", () => {
    const registry = readFileSync(join(process.cwd(), "src/templates/registry.ts"), "utf8");
    const generated = readFileSync(join(process.cwd(), "src/templates/generated-registry.ts"), "utf8");
    expect(registry).not.toMatch(/wedding-default|elegant-gold|minimal-white/);
    expect(generated).toMatch(/import \{ templateModule as /);
    expect(generated).not.toMatch(/import\s*\(|eval\s*\(|https?:\/\//);
  });

  it("discovers a complete dummy package from an isolated fixture without registering it for production", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "ngaturi-template-discovery-"));
    try {
      cpSync(join(process.cwd(), "tests/fixtures/templates/plug-and-play-fixture"), join(temporaryRoot, "plug-and-play-fixture"), { recursive: true });
      const output = join(temporaryRoot, "generated-registry.ts");
      execFileSync(process.execPath, ["scripts/generate-template-registry.mjs", "--templates-root", temporaryRoot, "--output", output], { cwd: process.cwd(), stdio: "pipe" });
      const generated = readFileSync(output, "utf8");
      expect(generated).toContain('import { templateModule as plugAndPlayFixture } from "./plug-and-play-fixture";');
      expect(generated).toContain("generatedTemplateModules = [plugAndPlayFixture]");
      expect(generated).not.toMatch(/import\s*\(|eval\s*\(|https?:\/\//);
      expect(fixtureTemplateModule.manifest.key).toBe("plug-and-play-fixture");
      expect(fixtureTemplateModule.sectionRenderers).toEqual(expect.objectContaining({ "fixture-cover": true, "fixture-closing": true }));
      expect(readFileSync(join(process.cwd(), "src/templates/generated-registry.ts"), "utf8")).not.toContain("plug-and-play-fixture");
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps application, repository, adapter, route, and editor dispatch free of template enumeration", () => {
    const centralFiles = [
      "src/application/invitation-service.ts",
      "src/repositories/supabase/application-repository.ts",
      "src/templates/editor-router.tsx",
      "src/invitation-modules/editor.tsx",
      "src/app/dashboard/invitations/new/page.tsx",
    ];
    for (const file of centralFiles) {
      expect(readFileSync(join(process.cwd(), file), "utf8")).not.toMatch(/wedding-default|elegant-gold|minimal-white|plug-and-play-fixture/);
    }
  });

  it("offers only Wedding Default for new production invitations while retaining compatibility renderers", () => {
    expect(Object.keys(templateRegistry).sort()).toEqual(["elegant-gold@1", "minimal-white@1", "wedding-default@1"]);
    expect(isTemplateAvailableForCreation("wedding-default", 1)).toBe(true);
    expect(isTemplateAvailableForCreation("elegant-gold", 1)).toBe(false);
    expect(isTemplateAvailableForCreation("minimal-white", 1)).toBe(false);
  });
});
