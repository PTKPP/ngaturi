import { z } from "zod";
import type { InvitationTemplate } from "@/domain/template";
import { getInvitationCategory } from "@/invitation-categories/registry";
import { moduleRegistry } from "./registry";
import { LegacyWeddingContentV1Schema, WeddingRenderModelSchema, type WeddingRenderModel } from "./schemas";
import type { InvitationModuleId } from "./types";
import { giftToCompatibilityText, hasPublicGift, type GiftModule } from "./definitions/gift";

export const ACTIVE_INVITATION_CONTENT_VERSION = 2;
export const ModuleStateSchema = z.object({ enabled: z.boolean() });
export const InvitationModuleContentSchema = z.object({
  modules: z.record(z.string(), z.unknown()),
  moduleVersions: z.record(z.string(), z.number().int().positive()).default({}),
  moduleState: z.record(z.string(), ModuleStateSchema),
  extensions: z.record(z.string(), z.unknown()).optional(),
});
export type InvitationModuleContent = z.infer<typeof InvitationModuleContentSchema>;

function defaultEnabled(template: InvitationTemplate, id: InvitationModuleId): boolean {
  return template.requiredModules.includes(id) || template.defaultEnabledModules.includes(id);
}

export function createTemplateContent(template: InvitationTemplate): InvitationModuleContent {
  const modules: Record<string, unknown> = {};
  const moduleVersions: Record<string, number> = {};
  const moduleState: Record<string, { enabled: boolean }> = {};
  for (const id of template.supportedModules) {
    modules[id] = moduleRegistry[id].createDefault();
    moduleVersions[id] = moduleRegistry[id].version;
    moduleState[id] = { enabled: defaultEnabled(template, id) };
  }
  return validateTemplateContent(template, { modules, moduleVersions, moduleState });
}

export function migrateLegacyWeddingContent(content: unknown, template: InvitationTemplate): InvitationModuleContent {
  const source = content && typeof content === "object" && !Array.isArray(content) ? content as Record<string, unknown> : {};
  const legacy = LegacyWeddingContentV1Schema.parse(source);
  const next = createTemplateContent(template);
  next.modules["couple-profile"] = legacy.couple;
  next.modules.event = moduleRegistry.event.migrate(1, { items: legacy.events });
  next.moduleVersions.event = moduleRegistry.event.version;
  next.modules.greeting = { text: legacy.copy.openingText };
  next.modules.quote = { text: legacy.copy.quote };
  next.modules["love-story"] = { text: legacy.copy.story };
  next.modules.closing = { text: legacy.copy.closingText };
  next.modules.gift = moduleRegistry.gift.migrate(1, { text: legacy.copy.giftInformation });
  next.moduleVersions.gift = moduleRegistry.gift.version;
  next.modules.gallery = { items: legacy.gallery };
  next.moduleState.gift = { enabled: legacy.settings.showGiftInformation };
  const unknown = Object.fromEntries(Object.entries(source).filter(([key]) => !["couple", "events", "copy", "gallery", "settings"].includes(key)));
  if (Object.keys(unknown).length) next.extensions = { legacyV1: unknown };
  return validateTemplateContent(template, next);
}

export function migrateTemplateContent(template: InvitationTemplate, version: number, content: unknown): InvitationModuleContent {
  if (version === 1) return migrateLegacyWeddingContent(content, template);
  if (version !== ACTIVE_INVITATION_CONTENT_VERSION) throw new Error(`Versi konten ${version} tidak didukung.`);
  return validateTemplateContent(template, content);
}

export function adaptContentToTemplate(source: InvitationModuleContent, template: InvitationTemplate): InvitationModuleContent {
  const next: InvitationModuleContent = structuredClone(source);
  for (const id of template.supportedModules) {
    if (next.modules[id] === undefined) {
      next.modules[id] = moduleRegistry[id].createDefault();
      next.moduleVersions[id] = moduleRegistry[id].version;
    }
    if (next.moduleState[id] === undefined) next.moduleState[id] = { enabled: defaultEnabled(template, id) };
  }
  return validateTemplateContent(template, next);
}

export function validateTemplateContent(template: InvitationTemplate, content: unknown): InvitationModuleContent {
  const parsed = InvitationModuleContentSchema.parse(content);
  const category = getInvitationCategory(template.categoryKey, template.categoryVersion);
  if (!category) throw new Error(`Kategori tidak terdaftar: ${template.categoryKey}@${template.categoryVersion}.`);
  for (const id of template.supportedModules) {
    const capability = category.capabilities[id];
    if (capability === "unsupported") throw new Error(`Modul ${id} tidak didukung kategori ${category.key}.`);
    let value = parsed.modules[id];
    if (value === undefined && !template.requiredModules.includes(id)) {
      value = moduleRegistry[id].createDefault();
      parsed.modules[id] = value;
      parsed.moduleVersions[id] = moduleRegistry[id].version;
    }
    if (value === undefined) throw new Error(`Konten modul ${id} wajib tersedia untuk template ${template.key}.`);
    const storedVersion = parsed.moduleVersions[id] ?? 1;
    parsed.modules[id] = moduleRegistry[id].migrate(storedVersion, value);
    parsed.moduleVersions[id] = moduleRegistry[id].version;
    const enabled = parsed.moduleState[id]?.enabled ?? defaultEnabled(template, id);
    if (template.requiredModules.includes(id) && !enabled) throw new Error(`Modul wajib ${id} tidak dapat dinonaktifkan.`);
    parsed.moduleState[id] = { enabled };
  }
  return parsed;
}

export function isModuleEnabled(content: InvitationModuleContent, id: InvitationModuleId): boolean { return content.moduleState[id]?.enabled ?? false; }

export function toWeddingRenderModel(content: InvitationModuleContent, respectModuleState = true): WeddingRenderModel {
  const couple = moduleRegistry["couple-profile"].schema.parse(content.modules["couple-profile"]);
  const events = moduleRegistry.event.schema.parse(content.modules.event).items;
  const text = (id: "greeting" | "quote" | "love-story" | "closing") => moduleRegistry[id].schema.parse(content.modules[id]).text;
  const enabledText = (id: "greeting" | "quote" | "love-story" | "closing") => !respectModuleState || isModuleEnabled(content, id) ? text(id) : "";
  const gift = moduleRegistry.gift.schema.parse(content.modules.gift) as GiftModule;
  const giftEnabled = (!respectModuleState || isModuleEnabled(content, "gift")) && hasPublicGift(gift);
  return WeddingRenderModelSchema.parse({
    couple,
    events,
    copy: { openingText: enabledText("greeting"), quote: enabledText("quote"), story: enabledText("love-story"), closingText: text("closing"), giftInformation: giftEnabled ? giftToCompatibilityText(gift) : "" },
    gallery: !respectModuleState || isModuleEnabled(content, "gallery") ? moduleRegistry.gallery.schema.parse(content.modules.gallery).items : [],
    settings: { showGiftInformation: isModuleEnabled(content, "gift") && hasPublicGift(gift) },
  });
}

export function updateFromWeddingRenderModel(base: InvitationModuleContent, value: WeddingRenderModel): InvitationModuleContent {
  return InvitationModuleContentSchema.parse({ ...base, modules: { ...base.modules,
    "couple-profile": value.couple, event: { items: value.events }, greeting: { text: value.copy.openingText },
    quote: { text: value.copy.quote }, "love-story": { text: value.copy.story }, closing: { text: value.copy.closingText },
    gallery: { items: value.gallery },
  } });
}
