import { InvitationThemesSchema } from "@/domain";
import type { TemplateThemeDefinition } from "@/themes/types";

export const themeDefinition: TemplateThemeDefinition = {
  schemaVersion: 1,
  fallbackThemeId: "minimal-white-default@1",
  allowedFonts: ["inter"],
  allowedOrnaments: ["none", "minimal-line"],
  allowedBackgrounds: ["none", "paper-soft"],
};

export const themes = InvitationThemesSchema.parse([
  {
    key: "minimal-white-default", version: 1, templateKey: "minimal-white", templateVersion: 1,
    name: "Putih Minimal", description: "Tampilan asli Minimal White.", status: "active", isDefault: true,
    tokens: { background: "#f8faf7", surface: "#ffffff", text: "#16201d", mutedText: "#64706b", primary: "#16201d", accent: "#7e9d8e", border: "#cbd7d0", headingFont: "inter", bodyFont: "inter", ornament: "minimal-line", backgroundPattern: "none", borderStyle: "soft" },
  },
  {
    key: "minimal-white-sage", version: 1, templateKey: "minimal-white", templateVersion: 1,
    name: "Sage Lembut", description: "Palet sage lembut dengan struktur yang sama.", status: "active", isDefault: false,
    tokens: { background: "#eef3ec", surface: "#fbfdf9", text: "#23352c", mutedText: "#607068", primary: "#355f49", accent: "#88a994", border: "#b9cbbf", headingFont: "inter", bodyFont: "inter", ornament: "minimal-line", backgroundPattern: "paper-soft", borderStyle: "soft" },
  },
]);
