import { z } from "zod";

export const FontIdSchema = z.enum(["inter", "cormorant-garamond", "josefin-sans", "sacramento", "noto-naskh-arabic"]);
export const OrnamentIdSchema = z.enum(["none", "minimal-line", "classic-gold", "islamic-arch"]);
export const BackgroundIdSchema = z.enum(["none", "paper-soft", "dark-grain", "mosque-soft"]);
export const BorderStyleIdSchema = z.enum(["none", "soft", "classic"]);

export const fontRegistry = {
  inter: "Inter, ui-sans-serif, system-ui, sans-serif",
  "cormorant-garamond": "Cormorant Garamond, Georgia, serif",
  "josefin-sans": "Josefin Sans, ui-sans-serif, sans-serif",
  sacramento: "Sacramento, cursive",
  "noto-naskh-arabic": "Noto Naskh Arabic, serif",
} as const;

export const ornamentRegistry = { none: "none", "minimal-line": "minimal-line", "classic-gold": "classic-gold", "islamic-arch": "islamic-arch" } as const;
export const backgroundRegistry = { none: "none", "paper-soft": "paper-soft", "dark-grain": "dark-grain", "mosque-soft": "mosque-soft" } as const;

export function safeFontFamily(id: z.infer<typeof FontIdSchema>): string { return fontRegistry[id] ?? fontRegistry.inter; }
