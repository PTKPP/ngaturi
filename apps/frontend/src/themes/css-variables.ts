import type { CSSProperties } from "react";
import type { InvitationTheme } from "@/domain";
import { safeFontFamily } from "@/invitation-design/registry";

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
