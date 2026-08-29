import { InvitationThemesSchema } from "@/domain";
import type { TemplateThemeDefinition } from "@/themes/types";

export const themeDefinition: TemplateThemeDefinition = {
  schemaVersion: 1,
  fallbackThemeId: "plug-and-play-fixture-default@1",
  allowedFonts: ["inter"],
  allowedOrnaments: ["none"],
  allowedBackgrounds: ["none"],
};

export const themes = InvitationThemesSchema.parse([{
  key: "plug-and-play-fixture-default",
  version: 1,
  templateKey: "plug-and-play-fixture",
  templateVersion: 1,
  name: "Fixture Default",
  description: "Preset khusus test discovery.",
  status: "active",
  isDefault: true,
  tokens: {
    background: "#ffffff",
    surface: "#ffffff",
    text: "#111111",
    mutedText: "#666666",
    primary: "#111111",
    accent: "#777777",
    border: "#dddddd",
    headingFont: "inter",
    bodyFont: "inter",
    ornament: "none",
    backgroundPattern: "none",
    borderStyle: "soft",
  },
}]);
