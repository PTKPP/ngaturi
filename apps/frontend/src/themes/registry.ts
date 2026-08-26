import type { CSSProperties } from "react";
import { InvitationThemesSchema, ThemeOverridesSchema, type InvitationTheme, type ThemeOverrides } from "@/domain";
import themesJson from "../../../../contracts/dummy-data/themes.json";
import { safeFontFamily } from "@/invitation-design/registry";

export interface TemplateThemeDefinition {
  schemaVersion: 1;
  fallbackThemeId: string;
  allowedFonts: readonly InvitationTheme["tokens"]["headingFont"][];
  allowedOrnaments: readonly InvitationTheme["tokens"]["ornament"][];
  allowedBackgrounds: readonly InvitationTheme["tokens"]["backgroundPattern"][];
}

export const templateThemeRegistry: Readonly<Record<string, TemplateThemeDefinition>> = {
  "minimal-white@1": { schemaVersion: 1, fallbackThemeId: "minimal-white-default@1", allowedFonts: ["inter"], allowedOrnaments: ["none", "minimal-line"], allowedBackgrounds: ["none", "paper-soft"] },
  "elegant-gold@1": { schemaVersion: 1, fallbackThemeId: "elegant-gold-default@1", allowedFonts: ["inter", "cormorant-garamond"], allowedOrnaments: ["none", "classic-gold"], allowedBackgrounds: ["none", "dark-grain"] },
  "daztore-inv1@1": { schemaVersion: 1, fallbackThemeId: "daztore-inv1-default@1", allowedFonts: ["josefin-sans", "cormorant-garamond", "sacramento", "noto-naskh-arabic"], allowedOrnaments: ["none", "islamic-arch"], allowedBackgrounds: ["none", "mosque-soft"] },
};

export const themeRegistry = InvitationThemesSchema.parse(themesJson);

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
export function themeCssVariables(theme: InvitationTheme): CSSProperties {
  return {
    "--theme-bg": theme.tokens.background,
    "--theme-surface": theme.tokens.surface,
    "--theme-ink": theme.tokens.text,
    "--theme-muted": theme.tokens.mutedText,
    "--theme-dark": theme.tokens.primary,
    "--theme-accent": theme.tokens.accent,
    "--theme-line": theme.tokens.border,
    "--theme-heading-font": safeFontFamily(theme.tokens.headingFont),
    "--theme-body-font": safeFontFamily(theme.tokens.bodyFont),
    "--theme-ornament": theme.tokens.ornament,
    "--theme-background-pattern": theme.tokens.backgroundPattern,
    "--theme-border-style": theme.tokens.borderStyle,
  } as CSSProperties;
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
