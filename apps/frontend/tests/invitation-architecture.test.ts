import { describe, expect, it, vi } from "vitest";
import invitations from "../../../contracts/dummy-data/invitations.json";
import templates from "../../../contracts/dummy-data/templates.json";
import themes from "../../../contracts/dummy-data/themes.json";
import users from "../../../contracts/dummy-data/users.json";
import { categoryRegistry, InvitationCategoriesSchema, InvitationSchema, InvitationThemesSchema, TemplatesSchema, ThemeOverridesSchema, UsersSchema } from "@/domain";
import { adaptContentToTemplate } from "@/invitation-modules/content";
import { INVITATION_MODULE_IDS } from "@/invitation-modules/types";
import { moduleRegistry } from "@/invitation-modules/registry";
import { getTemplateModule, parseTemplateContent, templateRegistry } from "@/templates/registry";
import { resolveRegisteredTheme, templateThemeRegistry, themeRegistry } from "@/themes/registry";
import { InvitationApplicationService } from "@/application/invitation-service";
import type { ApplicationRepository } from "@/repositories/contracts";

describe("final invitation architecture", () => {
  it("registers the five initial categories with an explicit capability for every module", () => {
    expect(categoryRegistry.map((category) => category.key)).toEqual(["wedding", "khitan", "aqiqah", "birthday", "corporate"]);
    for (const category of categoryRegistry) {
      expect(Object.keys(category.capabilities)).toHaveLength(INVITATION_MODULE_IDS.length);
      for (const id of category.requiredModules) expect(category.capabilities[id]).toBe("required");
    }
  });

  it("rejects duplicate category, template, and theme versioned keys", () => {
    expect(() => InvitationCategoriesSchema.parse([...categoryRegistry, categoryRegistry[0]])).toThrow("Kategori duplikat");
    expect(() => TemplatesSchema.parse([...templates, templates[0]])).toThrow("Template duplikat");
    expect(() => InvitationThemesSchema.parse([...themes, themes[0]])).toThrow("Tema duplikat");
  });

  it("keeps module schemas/defaults reusable and outside template renderers", () => {
    expect(Object.keys(moduleRegistry).sort()).toEqual([...INVITATION_MODULE_IDS].sort());
    for (const id of INVITATION_MODULE_IDS) {
      expect(moduleRegistry[id].id).toBe(id);
      expect(moduleRegistry[id].version).toBe(1);
      expect(moduleRegistry[id].schema.safeParse(moduleRegistry[id].createDefault()).success).toBe(true);
      expect(moduleRegistry[id].migrate(1, moduleRegistry[id].createDefault())).toBeTruthy();
    }
  });

  it("binds templates to categories, capability-compatible modules, and complete section renderer maps", () => {
    for (const template of Object.values(templateRegistry)) {
      expect(template.manifest.categoryKey).toBe("wedding");
      expect(template.manifest.activeContentSchemaVersion).toBe(2);
      const category = categoryRegistry.find((item) => item.key === template.manifest.categoryKey)!;
      for (const id of template.manifest.supportedModules) expect(category.capabilities[id]).not.toBe("unsupported");
      const renderers = template.sectionRenderers as Readonly<Record<string, true>>;
      for (const section of template.manifest.sections) expect(renderers[section.renderer]).toBe(true);
    }
  });

  it("rejects disabled required modules while preserving inactive and unsupported module data", () => {
    const source = parseTemplateContent("minimal-white", 1, 1, invitations[0].content);
    const invalid = structuredClone(source); invalid.moduleState.cover = { enabled: false };
    expect(() => parseTemplateContent("minimal-white", 1, 2, invalid)).toThrow("tidak dapat dinonaktifkan");
    source.modules.wishes = { enabled: true, draftMessage: "tetap ada" };
    source.moduleVersions.wishes = 1;
    source.moduleState.wishes = { enabled: false };
    const switched = adaptContentToTemplate(source, getTemplateModule("daztore-inv1", 1)!.manifest);
    expect(switched.modules.wishes).toEqual({ enabled: true, draftMessage: "tetap ada" });
    expect(switched.moduleState.wishes.enabled).toBe(false);
  });

  it("limits theme references and falls back safely for missing presets or invalid overrides", () => {
    expect(Object.keys(templateThemeRegistry).sort()).toEqual(["daztore-inv1@1", "elegant-gold@1", "minimal-white@1"]);
    expect(() => ThemeOverridesSchema.parse({ rawCss: "body{display:none}", headingFont: "https://evil.example/font.woff" })).toThrow();
    const fallback = resolveRegisteredTheme("minimal-white", 1, "missing", 99, { headingFont: "cormorant-garamond" } as never)!;
    expect(fallback.fallbackUsed).toBe(true);
    expect(fallback.theme.key).toBe("minimal-white-default");
    expect(fallback.theme.tokens.headingFont).toBe("inter");
    expect(themeRegistry.every((theme) => !JSON.stringify(theme.tokens).match(/https?:|<script|\burl\s*\(/i))).toBe(true);
  });

  it("rejects cross-category template switching before repository mutation", async () => {
    const actor = UsersSchema.parse(users).find((user) => user.role === "user")!;
    const incompatibleCurrent = InvitationSchema.parse({ ...invitations[0], categoryKey: "birthday" });
    const updateInvitation = vi.fn();
    const repository = {
      findOwnedInvitation: vi.fn(async () => incompatibleCurrent),
      listThemes: vi.fn(async () => themeRegistry),
      updateInvitation,
    } as unknown as ApplicationRepository;
    await expect(new InvitationApplicationService(repository).switchTemplate(actor, incompatibleCurrent.id, "elegant-gold", 1)).rejects.toThrow("lintas kategori");
    expect(updateInvitation).not.toHaveBeenCalled();
  });
});
