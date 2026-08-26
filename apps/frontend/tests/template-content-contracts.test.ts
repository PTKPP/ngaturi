import { describe, expect, it } from "vitest";
import invitations from "../../../contracts/dummy-data/invitations.json";
import { InvitationSchema } from "@/domain";
import { getTemplateModule, parseTemplateContent, templateRegistry } from "@/templates/registry";
import { themeRegistry } from "@/themes/registry";

describe("template-specific content contracts", () => {
  it("keeps universal content fields out of the base invitation schema", () => {
    expect(Object.keys(InvitationSchema.shape)).not.toEqual(expect.arrayContaining(["couple", "events", "gallery", "settings"]));
    expect(InvitationSchema.shape.content).toBeDefined();
  });

  it("exposes a complete versioned module contract for every renderer", () => {
    for (const [id, templateModule] of Object.entries(templateRegistry)) {
      expect(templateModule.activeContentSchemaVersion).toBe(1);
      expect(templateModule.contentSchema.parse(templateModule.createDefaultContent())).toBeTruthy();
      expect(templateModule.editor).toBeTypeOf("function");
      expect(templateModule.component).toBeTypeOf("function");
      expect(templateModule.compatibleThemes.length).toBeGreaterThanOrEqual(2);
      expect(() => templateModule.migrateContent(99, {})).toThrow("tidak didukung");
      expect(id).toBe(`${templateModule.manifest.key}@${templateModule.manifest.version}`);
    }
  });

  it("validates fixtures with their owning template schema and rejects incompatible content", () => {
    for (const raw of invitations) {
      const invitation = InvitationSchema.parse(raw);
      expect(parseTemplateContent(invitation.templateKey, invitation.templateVersion, invitation.contentSchemaVersion, invitation.content)).toBeTruthy();
      expect(() => parseTemplateContent(invitation.templateKey, invitation.templateVersion, invitation.contentSchemaVersion, { arbitrary: true })).toThrow();
    }
  });

  it("reports unsupported fields during conversion and initializes missing fields from defaults", () => {
    const templateModule = getTemplateModule("elegant-gold", 1)!;
    const converted = templateModule.convertContent({ templateOnly: "lost" });
    expect(converted.discardedFields).toEqual(["templateOnly"]);
    expect(templateModule.contentSchema.parse(converted.content).events).toHaveLength(1);
  });

  it("keeps registry theme compatibility identical to the typed theme catalogue", () => {
    for (const templateModule of Object.values(templateRegistry)) {
      const catalogue = themeRegistry.filter((theme) => theme.templateKey === templateModule.manifest.key && theme.templateVersion === templateModule.manifest.version).map((theme) => `${theme.key}@${theme.version}`).sort();
      expect([...templateModule.compatibleThemes].sort()).toEqual(catalogue);
      expect(themeRegistry.filter((theme) => catalogue.includes(`${theme.key}@${theme.version}`) && theme.isDefault && theme.status === "active")).toHaveLength(1);
    }
  });
});
