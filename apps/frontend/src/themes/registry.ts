import { InvitationThemesSchema, ThemeOverridesSchema, type InvitationTheme, type ThemeOverrides } from "@/domain";
import { generatedTemplateModules } from "@/templates/generated-registry";
import type { TemplateThemeDefinition } from "./types";

export { themeCssVariables } from "./css-variables";

export const templateThemeRegistry: Readonly<Record<string, TemplateThemeDefinition>> = Object.fromEntries(generatedTemplateModules.map((templateModule) => [`${templateModule.manifest.key}@${templateModule.manifest.version}`, templateModule.themeDefinition]));
export const themeRegistry = InvitationThemesSchema.parse(generatedTemplateModules.flatMap((templateModule) => templateModule.themes));

export function getRegisteredTheme(key: string, version: number): InvitationTheme | null {
  return themeRegistry.find((theme) => theme.key === key && theme.version === version) ?? null;
}
export function getRegisteredThemesForTemplate(templateKey: string, templateVersion: number): InvitationTheme[] {
  return themeRegistry.filter((theme) => theme.templateKey === templateKey && theme.templateVersion === templateVersion);
}
export function resolveRegisteredTheme(templateKey: string, templateVersion: number, key: string, version: number, overrides: ThemeOverrides = {}): { theme: InvitationTheme; fallbackUsed: boolean } | null {
  const definition = templateThemeRegistry[`${templateKey}@${templateVersion}`];
  if (!definition) return null;
  const compatible = getRegisteredThemesForTemplate(templateKey, templateVersion).filter((theme) => theme.status === "active");
  const requested = compatible.find((theme) => theme.key === key && theme.version === version);
  const [fallbackKey, fallbackVersion] = definition.fallbackThemeId.split("@");
  const preset = requested ?? compatible.find((theme) => theme.key === fallbackKey && theme.version === Number(fallbackVersion));
  if (!preset) return null;
  const parsedOverrides = ThemeOverridesSchema.safeParse(overrides);
  const safeOverrides = parsedOverrides.success ? parsedOverrides.data : {};
  if (safeOverrides.headingFont && !definition.allowedFonts.includes(safeOverrides.headingFont)) delete safeOverrides.headingFont;
  if (safeOverrides.bodyFont && !definition.allowedFonts.includes(safeOverrides.bodyFont)) delete safeOverrides.bodyFont;
  if (safeOverrides.ornament && !definition.allowedOrnaments.includes(safeOverrides.ornament)) delete safeOverrides.ornament;
  if (safeOverrides.backgroundPattern && !definition.allowedBackgrounds.includes(safeOverrides.backgroundPattern)) delete safeOverrides.backgroundPattern;
  return { theme: { ...preset, tokens: { ...preset.tokens, ...safeOverrides } }, fallbackUsed: !requested };
}
for (const theme of themeRegistry) {
  const definition = templateThemeRegistry[`${theme.templateKey}@${theme.templateVersion}`];
  if (!definition || !definition.allowedFonts.includes(theme.tokens.headingFont) || !definition.allowedFonts.includes(theme.tokens.bodyFont) || !definition.allowedOrnaments.includes(theme.tokens.ornament) || !definition.allowedBackgrounds.includes(theme.tokens.backgroundPattern)) throw new Error(`Preset tema tidak sesuai definition: ${theme.key}@${theme.version}.`);
}

for (const [templateId, definition] of Object.entries(templateThemeRegistry)) {
  const compatible = themeRegistry.filter((theme) => `${theme.templateKey}@${theme.templateVersion}` === templateId && theme.status === "active");
  if (compatible.filter((theme) => theme.isDefault).length !== 1) throw new Error(`Template ${templateId} harus memiliki tepat satu tema default aktif.`);
  if (!compatible.some((theme) => `${theme.key}@${theme.version}` === definition.fallbackThemeId)) throw new Error(`Fallback tema tidak terdaftar: ${definition.fallbackThemeId}.`);
}
