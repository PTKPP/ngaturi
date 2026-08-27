import type { InvitationTheme } from "@/domain";

export interface TemplateThemeDefinition {
  schemaVersion: 1;
  fallbackThemeId: string;
  allowedFonts: readonly InvitationTheme["tokens"]["headingFont"][];
  allowedOrnaments: readonly InvitationTheme["tokens"]["ornament"][];
  allowedBackgrounds: readonly InvitationTheme["tokens"]["backgroundPattern"][];
}
