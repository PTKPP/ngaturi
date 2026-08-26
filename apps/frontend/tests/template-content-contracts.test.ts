import { describe, expect, it } from "vitest";
import invitations from "../../../contracts/dummy-data/invitations.json";
import { InvitationSchema } from "@/domain";
import { adaptContentToTemplate, createTemplateContent, toWeddingRenderModel } from "@/invitation-modules/content";
import { INVITATION_MODULE_IDS } from "@/invitation-modules/types";
import { moduleRegistry } from "@/invitation-modules/registry";
import { getTemplateModule, parseTemplateContent, templateRegistry } from "@/templates/registry";
import { themeRegistry } from "@/themes/registry";

describe("category, module, template, and theme content contracts", () => {
  it("keeps semantic fields in registered modules rather than the base invitation", () => {
    expect(Object.keys(InvitationSchema.shape)).not.toEqual(expect.arrayContaining(["couple", "events", "gallery", "settings"]));
    expect(Object.keys(moduleRegistry)).toEqual(INVITATION_MODULE_IDS);
    for (const definition of Object.values(moduleRegistry)) expect(definition.schema.parse(definition.createDefault())).toBeTruthy();
  });

  it("exposes structural composition and complete renderer declarations", () => {
    for (const [id, templateModule] of Object.entries(templateRegistry)) {
      expect(templateModule.activeContentSchemaVersion).toBe(2);
      expect(createTemplateContent(templateModule.manifest)).toBeTruthy();
      expect(templateModule.component).toBeTypeOf("function");
      expect(templateModule.compatibleThemes.length).toBeGreaterThanOrEqual(2);
      for (const section of templateModule.manifest.sections) expect(templateModule.sectionRenderers).toHaveProperty(section.renderer, true);
      expect(id).toBe(`${templateModule.manifest.key}@${templateModule.manifest.version}`);
    }
  });

  it("reads legacy v1 fixtures and rejects unsupported versions or invalid content", () => {
    for (const raw of invitations) {
      const invitation = InvitationSchema.parse(raw);
      expect(toWeddingRenderModel(parseTemplateContent(invitation.templateKey, invitation.templateVersion, 1, invitation.content)).events.length).toBeGreaterThan(0);
      expect(() => parseTemplateContent(invitation.templateKey, invitation.templateVersion, 99, invitation.content)).toThrow("tidak didukung");
      expect(() => parseTemplateContent(invitation.templateKey, invitation.templateVersion, 1, { arbitrary: true })).toThrow();
    }
  });

  it("preserves inactive and unknown legacy data during a same-category switch", () => {
    const source = { ...invitations[0].content, templateOnly: { preserved: true } };
    const current = parseTemplateContent("minimal-white", 1, 1, source);
    const target = getTemplateModule("daztore-inv1", 1)!;
    const converted = adaptContentToTemplate(current, target.manifest);
    expect(converted.extensions).toEqual({ legacyV1: { templateOnly: { preserved: true } } });
    expect(converted.modules).toHaveProperty("countdown");
    expect(converted.modules).toHaveProperty("couple-profile");
  });

  it("adapts idempotently and ignores inactive module data only in the render projection", () => {
    const first = parseTemplateContent("minimal-white", 1, 1, invitations[0].content);
    const second = parseTemplateContent("minimal-white", 1, 2, first);
    expect(second).toEqual(first);
    second.modules.quote = { text: "tetap tersimpan" };
    second.moduleState.quote = { enabled: false };
    expect(toWeddingRenderModel(second).copy.quote).toBe("");
    expect(second.modules.quote).toEqual({ text: "tetap tersimpan" });
  });

  it("keeps registry theme compatibility identical to the typed theme catalogue", () => {
    for (const templateModule of Object.values(templateRegistry)) {
      const catalogue = themeRegistry.filter((theme) => theme.templateKey === templateModule.manifest.key && theme.templateVersion === templateModule.manifest.version).map((theme) => `${theme.key}@${theme.version}`).sort();
      expect([...templateModule.compatibleThemes].sort()).toEqual(catalogue);
      expect(themeRegistry.filter((theme) => catalogue.includes(`${theme.key}@${theme.version}`) && theme.isDefault && theme.status === "active")).toHaveLength(1);
    }
  });
});
