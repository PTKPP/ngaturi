import * as daztoreInv1 from "./renderers/daztore-inv1";
import * as elegantGold from "./renderers/elegant-gold";
import * as minimalWhite from "./renderers/minimal-white";
import type { TemplateModule } from "./types";
import type { WeddingContent } from "./shared/content-schema";

export const templateRegistry = {
  "elegant-gold@1": elegantGold,
  "minimal-white@1": minimalWhite,
  "daztore-inv1@1": daztoreInv1,
} satisfies Record<string, TemplateModule<WeddingContent>>;

export type RegisteredTemplateId = keyof typeof templateRegistry;

export function getTemplateModule(key: string, version: number): TemplateModule<WeddingContent> | null {
  return (templateRegistry as Record<string, TemplateModule<WeddingContent>>)[`${key}@${version}`] ?? null;
}

export function parseTemplateContent(key: string, version: number, contentSchemaVersion: number, content: unknown): WeddingContent {
  const templateModule = getTemplateModule(key, version);
  if (!templateModule) throw new Error(`Template tidak terdaftar: ${key}@${version}.`);
  return templateModule.migrateContent(contentSchemaVersion, content);
}
