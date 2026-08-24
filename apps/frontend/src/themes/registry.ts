import type { CSSProperties } from "react";
import { InvitationThemesSchema, type InvitationTheme } from "@/domain";
import themesJson from "../../../../contracts/dummy-data/themes.json";

export const themeRegistry = InvitationThemesSchema.parse(themesJson);

export function getRegisteredTheme(key: string, version: number): InvitationTheme | null {
  return themeRegistry.find((theme) => theme.key === key && theme.version === version) ?? null;
}
export function getRegisteredThemesForTemplate(templateKey: string, templateVersion: number): InvitationTheme[] {
  return themeRegistry.filter((theme) => theme.templateKey === templateKey && theme.templateVersion === templateVersion);
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
  } as CSSProperties;
}
