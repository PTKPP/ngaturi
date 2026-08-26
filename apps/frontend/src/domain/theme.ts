import { z } from "zod";
import { BackgroundIdSchema, BorderStyleIdSchema, FontIdSchema, OrnamentIdSchema } from "@/invitation-design/registry";

const SafeColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "Token warna tema harus berupa warna hex enam digit.");
export const ThemeStatusSchema = z.enum(["active", "inactive"]);
export const ThemeTokensSchema = z.object({
  background: SafeColorSchema, surface: SafeColorSchema, text: SafeColorSchema,
  mutedText: SafeColorSchema, primary: SafeColorSchema, accent: SafeColorSchema, border: SafeColorSchema,
  headingFont: FontIdSchema,
  bodyFont: FontIdSchema,
  ornament: OrnamentIdSchema,
  backgroundPattern: BackgroundIdSchema,
  borderStyle: BorderStyleIdSchema,
});
export const ThemeOverridesSchema = ThemeTokensSchema.partial().strict();
export const InvitationThemeSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/), version: z.number().int().positive(),
  templateKey: z.string().regex(/^[a-z0-9-]+$/), templateVersion: z.number().int().positive(),
  name: z.string().trim().min(1), description: z.string().trim().min(1),
  status: ThemeStatusSchema, isDefault: z.boolean(), tokens: ThemeTokensSchema,
});
export const InvitationThemesSchema = z.array(InvitationThemeSchema).superRefine((themes, context) => {
  const ids = new Set<string>();
  for (const [index, theme] of themes.entries()) {
    const id = `${theme.key}@${theme.version}`;
    if (ids.has(id)) context.addIssue({ code: "custom", path: [index, "key"], message: `Tema duplikat: ${id}.` });
    ids.add(id);
  }
});
export type InvitationTheme = z.infer<typeof InvitationThemeSchema>;
export type ThemeOverrides = z.infer<typeof ThemeOverridesSchema>;
export function themeId(theme: Pick<InvitationTheme, "key" | "version">): string { return `${theme.key}@${theme.version}`; }
export function themeTemplateId(theme: Pick<InvitationTheme, "templateKey" | "templateVersion">): string { return `${theme.templateKey}@${theme.templateVersion}`; }
