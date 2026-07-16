import { z } from "zod";

export const TemplateStatusSchema = z.enum(["active", "inactive"]);
export const TemplateSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  version: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().min(1),
  thumbnail: z.string().min(1),
  status: TemplateStatusSchema,
  supportedSections: z.array(z.string().min(1)).min(1),
});

export const TemplatesSchema = z.array(TemplateSchema);
export type InvitationTemplate = z.infer<typeof TemplateSchema>;

export function templateId(template: Pick<InvitationTemplate, "key" | "version">): string {
  return `${template.key}@${template.version}`;
}
