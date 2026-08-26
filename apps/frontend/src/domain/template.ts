import { z } from "zod";
import { InvitationCategoryKeySchema } from "@/invitation-categories/registry";
import { InvitationModuleIdSchema } from "@/invitation-modules/types";

export const TemplateStatusSchema = z.enum(["active", "inactive"]);
export const TemplateSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  version: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().min(1),
  thumbnail: z.string().min(1),
  status: TemplateStatusSchema,
  categoryKey: InvitationCategoryKeySchema,
  categoryVersion: z.number().int().positive(),
  activeContentSchemaVersion: z.number().int().positive(),
  themeSchemaVersion: z.number().int().positive(),
  supportedModules: z.array(InvitationModuleIdSchema).min(1),
  requiredModules: z.array(InvitationModuleIdSchema).min(1),
  optionalModules: z.array(InvitationModuleIdSchema),
  defaultEnabledModules: z.array(InvitationModuleIdSchema),
  sections: z.array(z.object({ id: z.string().min(1), moduleId: InvitationModuleIdSchema, renderer: z.string().regex(/^[a-z0-9-]+$/) })).min(1),
  supportedSections: z.array(z.string().min(1)).min(1),
}).superRefine((template, context) => {
  const supported = new Set(template.supportedModules);
  for (const id of template.requiredModules) if (!supported.has(id)) context.addIssue({ code: "custom", path: ["requiredModules"], message: `Modul wajib ${id} harus didukung template.` });
  for (const id of template.optionalModules) if (!supported.has(id)) context.addIssue({ code: "custom", path: ["optionalModules"], message: `Modul opsional ${id} harus didukung template.` });
  for (const id of template.defaultEnabledModules) if (!supported.has(id)) context.addIssue({ code: "custom", path: ["defaultEnabledModules"], message: `Modul default ${id} harus didukung template.` });
  for (const section of template.sections) if (!supported.has(section.moduleId)) context.addIssue({ code: "custom", path: ["sections"], message: `Section ${section.id} merujuk modul yang tidak didukung.` });
  const classifications = [...template.requiredModules, ...template.optionalModules, ...template.defaultEnabledModules];
  if (new Set(classifications).size !== classifications.length || classifications.length !== supported.size || classifications.some((id) => !supported.has(id))) context.addIssue({ code: "custom", path: ["supportedModules"], message: "Setiap modul template harus diklasifikasikan tepat sekali sebagai required, optional, atau default-enabled." });
});

export const TemplatesSchema = z.array(TemplateSchema).superRefine((templates, context) => {
  const ids = new Set<string>();
  for (const [index, template] of templates.entries()) {
    const id = `${template.key}@${template.version}`;
    if (ids.has(id)) context.addIssue({ code: "custom", path: [index, "key"], message: `Template duplikat: ${id}.` });
    ids.add(id);
  }
});
export type InvitationTemplate = z.infer<typeof TemplateSchema>;

export function templateId(template: Pick<InvitationTemplate, "key" | "version">): string {
  return `${template.key}@${template.version}`;
}
