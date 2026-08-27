import { InvitationThemesSchema } from "@/domain";
import type { TemplateThemeDefinition } from "@/themes/types";

export const themeDefinition: TemplateThemeDefinition = {
  schemaVersion: 1,
  fallbackThemeId: "elegant-gold-default@1",
  allowedFonts: ["inter", "cormorant-garamond"],
  allowedOrnaments: ["none", "classic-gold"],
  allowedBackgrounds: ["none", "dark-grain"],
};

export const themes = InvitationThemesSchema.parse([
  {
    key: "elegant-gold-default", version: 1, templateKey: "elegant-gold", templateVersion: 1,
    name: "Emas Klasik", description: "Tampilan asli Elegant Gold.", status: "active", isDefault: true,
    tokens: { background: "#1c1712", surface: "#241e18", text: "#f7ecd5", mutedText: "#d9c9aa", primary: "#d3ad61", accent: "#a98847", border: "#7c653c", headingFont: "cormorant-garamond", bodyFont: "inter", ornament: "classic-gold", backgroundPattern: "dark-grain", borderStyle: "classic" },
  },
  {
    key: "elegant-gold-rose", version: 1, templateKey: "elegant-gold", templateVersion: 1,
    name: "Rose Malam", description: "Palet rose gelap tanpa perubahan struktur.", status: "active", isDefault: false,
    tokens: { background: "#24171c", surface: "#301f25", text: "#fae9ee", mutedText: "#d7bfc7", primary: "#dfa4b5", accent: "#b87589", border: "#805363", headingFont: "cormorant-garamond", bodyFont: "inter", ornament: "classic-gold", backgroundPattern: "dark-grain", borderStyle: "classic" },
  },
]);
