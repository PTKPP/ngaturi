import { InvitationThemesSchema } from "@/domain";
import type { TemplateThemeDefinition } from "@/themes/types";

export const themeDefinition: TemplateThemeDefinition = {
  schemaVersion: 1,
  fallbackThemeId: "wedding-default-default@1",
  allowedFonts: ["josefin-sans", "cormorant-garamond", "sacramento", "noto-naskh-arabic"],
  allowedOrnaments: ["none", "islamic-arch"],
  allowedBackgrounds: ["none", "mosque-soft"],
};

export const themes = InvitationThemesSchema.parse([
  {
    key: "wedding-default-default", version: 1, templateKey: "wedding-default", templateVersion: 1,
    name: "Monokrom Klasik", description: "Tampilan default Wedding Default.", status: "active", isDefault: true,
    tokens: { background: "#f5f2ec", surface: "#fffdf9", text: "#242526", mutedText: "#706d68", primary: "#2f3133", accent: "#a9a39a", border: "#d8d3ca", headingFont: "cormorant-garamond", bodyFont: "josefin-sans", ornament: "islamic-arch", backgroundPattern: "mosque-soft", borderStyle: "classic" },
  },
  {
    key: "wedding-default-blue", version: 1, templateKey: "wedding-default", templateVersion: 1,
    name: "Biru Teduh", description: "Palet biru teduh dengan struktur Wedding Default yang sama.", status: "active", isDefault: false,
    tokens: { background: "#edf2f5", surface: "#fbfdff", text: "#24313a", mutedText: "#63727d", primary: "#304b5c", accent: "#8ca9ba", border: "#c5d2d9", headingFont: "cormorant-garamond", bodyFont: "josefin-sans", ornament: "islamic-arch", backgroundPattern: "mosque-soft", borderStyle: "classic" },
  },
]);
