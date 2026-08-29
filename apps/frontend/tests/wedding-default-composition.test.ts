import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getInvitationCategory } from "@/invitation-categories/registry";
import { createTemplateContent } from "@/invitation-modules/content";
import { parseTemplateContent } from "@/templates/registry";
import { manifest } from "@/templates/wedding-default/manifest";
import { sectionRenderers } from "@/templates/wedding-default";
import { getRegisteredTheme, themeCssVariables } from "@/themes/registry";

describe("wedding-default composition", () => {
  it("declares the intended ordered Wedding sections with one renderer each", () => {
    expect(manifest.sections.map((section) => section.id)).toEqual(["cover", "greeting", "couple", "quote", "events", "countdown", "story", "gallery", "video", "rsvp", "gift", "wishes", "maps", "closing"]);
    for (const section of manifest.sections) expect(sectionRenderers).toHaveProperty(section.renderer, true);
  });

  it("uses only Wedding-allowed modules and includes every required module", () => {
    const wedding = getInvitationCategory("wedding", 1)!;
    for (const id of manifest.supportedModules) expect(wedding.capabilities[id]).not.toBe("unsupported");
    for (const id of wedding.requiredModules) expect(manifest.requiredModules).toContain(id);
  });

  it("hydrates newly added optional modules without deleting existing inactive data", () => {
    const oldV2 = createTemplateContent(manifest);
    oldV2.modules.rsvp = { enabled: true, preservedDraft: "tetap ada" };
    oldV2.moduleState.rsvp = { enabled: false };
    for (const id of ["video", "wishes", "music"] as const) {
      delete oldV2.modules[id];
      delete oldV2.moduleVersions[id];
      delete oldV2.moduleState[id];
    }
    const migrated = parseTemplateContent("wedding-default", 1, 2, oldV2);
    expect(migrated.modules).toHaveProperty("video");
    expect(migrated.modules).toHaveProperty("wishes");
    expect(migrated.modules).toHaveProperty("music");
    expect(migrated.modules.rsvp).toMatchObject({ enabled: true, preservedDraft: "tetap ada" });
    expect(migrated.moduleState.rsvp.enabled).toBe(false);
  });

  it("maps both Daztore presets into the complete semantic CSS variable set", () => {
    const first = themeCssVariables(getRegisteredTheme("wedding-default-default", 1)!);
    const second = themeCssVariables(getRegisteredTheme("wedding-default-blue", 1)!);
    for (const key of ["--theme-bg", "--theme-surface", "--theme-ink", "--theme-muted", "--theme-dark", "--theme-accent", "--theme-line", "--theme-heading-font", "--theme-body-font", "--theme-ornament", "--theme-background-pattern"]) {
      expect(first).toHaveProperty(key);
      expect(second).toHaveProperty(key);
    }
    expect(first["--theme-bg" as keyof typeof first]).not.toBe(second["--theme-bg" as keyof typeof second]);
    expect(first["--theme-dark" as keyof typeof first]).not.toBe(second["--theme-dark" as keyof typeof second]);
  });

  it("keeps audio ownership shared and introduces no raw CSS, HTML, or arbitrary visual URLs", () => {
    const root = join(process.cwd(), "src/templates/wedding-default");
    const source = readdirSync(join(root, "components"), { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".tsx")).map((entry) => readFileSync(join(root, "components", entry.name), "utf8")).join("\n");
    const styles = readFileSync(join(root, "styles.module.css"), "utf8");
    expect(source).not.toMatch(/<audio|dangerouslySetInnerHTML|style=\{\{[^}]*url/i);
    expect(source).not.toMatch(/supabase|service.role|localStorage/i);
    expect(styles).not.toMatch(/url\s*\(/i);
    expect(readFileSync(join(process.cwd(), "src/templates/shared/InvitationExperienceShell.tsx"), "utf8")).toMatch(/<audio/);
  });
});
