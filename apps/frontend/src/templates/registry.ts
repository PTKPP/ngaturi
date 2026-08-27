import type { TemplateModule } from "./types";
import { generatedTemplateModules } from "./generated-registry";
import { migrateTemplateContent, type InvitationModuleContent } from "@/invitation-modules/content";
import { getInvitationCategory } from "@/invitation-categories/registry";

const templateEntries = generatedTemplateModules.map((templateModule) => [`${templateModule.manifest.key}@${templateModule.manifest.version}`, templateModule] as const);
if (new Set(templateEntries.map(([id]) => id)).size !== templateEntries.length) throw new Error("ID template generated harus unik.");
export const templateRegistry: Readonly<Record<string, TemplateModule>> = Object.fromEntries(templateEntries);

export type RegisteredTemplateId = string;

export function getTemplateModule(key: string, version: number): TemplateModule | null {
  return (templateRegistry as Record<string, TemplateModule>)[`${key}@${version}`] ?? null;
}

export function isTemplateAvailableForCreation(key: string, version: number): boolean {
  return getTemplateModule(key, version)?.availability === "production";
}

export function parseTemplateContent(key: string, version: number, contentSchemaVersion: number, content: unknown): InvitationModuleContent {
  const templateModule = getTemplateModule(key, version);
  if (!templateModule) throw new Error(`Template tidak terdaftar: ${key}@${version}.`);
  return migrateTemplateContent(templateModule.manifest, contentSchemaVersion, content);
}

for (const [id, templateModule] of Object.entries(templateRegistry)) {
  if (id !== `${templateModule.manifest.key}@${templateModule.manifest.version}`) throw new Error(`ID registry template tidak cocok: ${id}.`);
  if (templateModule.activeContentSchemaVersion !== templateModule.manifest.activeContentSchemaVersion) throw new Error(`Versi konten template tidak cocok: ${id}.`);
  const category = getInvitationCategory(templateModule.manifest.categoryKey, templateModule.manifest.categoryVersion);
  if (!category) throw new Error(`Kategori template tidak terdaftar: ${id}.`);
  for (const moduleId of templateModule.manifest.supportedModules) if (category.capabilities[moduleId] === "unsupported") throw new Error(`Modul ${moduleId} tidak didukung kategori template ${id}.`);
  for (const moduleId of category.requiredModules) if (!templateModule.manifest.requiredModules.includes(moduleId)) throw new Error(`Template ${id} tidak mendeklarasikan modul wajib kategori ${moduleId}.`);
  for (const moduleId of templateModule.manifest.optionalModules) if (category.capabilities[moduleId] !== "optional") throw new Error(`Modul ${moduleId} bukan optional pada kategori template ${id}.`);
  for (const moduleId of templateModule.manifest.defaultEnabledModules) if (category.capabilities[moduleId] !== "default") throw new Error(`Modul ${moduleId} bukan default pada kategori template ${id}.`);
  const themeDefinition = templateModule.themeDefinition;
  if (themeDefinition.schemaVersion !== templateModule.manifest.themeSchemaVersion) throw new Error(`Theme schema template tidak terdaftar atau versinya tidak cocok: ${id}.`);
  const compatibleThemes = templateModule.themes.map((theme) => `${theme.key}@${theme.version}`);
  const declaredThemes = templateModule.compatibleThemes as readonly string[];
  if (declaredThemes.some((themeId) => !compatibleThemes.includes(themeId)) || compatibleThemes.some((themeId) => !declaredThemes.includes(themeId))) throw new Error(`Daftar tema template tidak sama dengan registry: ${id}.`);
  const activeThemes = templateModule.themes.filter((theme) => theme.status === "active");
  if (activeThemes.filter((theme) => theme.isDefault).length !== 1) throw new Error(`Template ${id} harus memiliki tepat satu tema default aktif.`);
  if (!activeThemes.some((theme) => `${theme.key}@${theme.version}` === themeDefinition.fallbackThemeId)) throw new Error(`Fallback tema tidak terdaftar: ${themeDefinition.fallbackThemeId}.`);
  const renderers = templateModule.sectionRenderers as Readonly<Record<string, true>>;
  for (const section of templateModule.manifest.sections) if (!renderers[section.renderer]) throw new Error(`Renderer section ${section.renderer} tidak terdaftar pada ${id}.`);
}
