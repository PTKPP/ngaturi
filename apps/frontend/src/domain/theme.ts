import { z } from "zod";

const SafeColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, "Token warna tema harus berupa warna hex enam digit.");
export const ThemeStatusSchema = z.enum(["active", "inactive"]);
export const ThemeTokensSchema = z.object({
  background: SafeColorSchema, surface: SafeColorSchema, text: SafeColorSchema,
  mutedText: SafeColorSchema, primary: SafeColorSchema, accent: SafeColorSchema, border: SafeColorSchema,
});
export const InvitationThemeSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/), version: z.number().int().positive(),
  templateKey: z.string().regex(/^[a-z0-9-]+$/), templateVersion: z.number().int().positive(),
  name: z.string().trim().min(1), description: z.string().trim().min(1),
  status: ThemeStatusSchema, isDefault: z.boolean(), tokens: ThemeTokensSchema,
});
export const InvitationThemesSchema = z.array(InvitationThemeSchema);
export type InvitationTheme = z.infer<typeof InvitationThemeSchema>;
export function themeId(theme: Pick<InvitationTheme, "key" | "version">): string { return `${theme.key}@${theme.version}`; }
export function themeTemplateId(theme: Pick<InvitationTheme, "templateKey" | "templateVersion">): string { return `${theme.templateKey}@${theme.templateVersion}`; }
