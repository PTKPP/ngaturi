import { z } from "zod";
import { InvitationsSchema } from "./invitation";
import { InvitationRoutesSchema } from "./route";
import { TemplatesSchema, templateId } from "./template";
import { InvitationThemesSchema, themeId, themeTemplateId } from "./theme";
import { UsersSchema } from "./user";

export const FrontendContractSchema = z.object({
  users: UsersSchema,
  routes: InvitationRoutesSchema,
  templates: TemplatesSchema,
  themes: InvitationThemesSchema,
  invitations: InvitationsSchema,
}).superRefine((contract, context) => {
  const userIds = new Set<string>();
  const userEmails = new Set<string>();
  for (const [index, user] of contract.users.entries()) {
    addDuplicateIssue(userIds, user.id, context, ["users", index, "id"], "ID user harus unik.");
    addDuplicateIssue(userEmails, user.email, context, ["users", index, "email"], "Email user harus unik.");
  }

  const templateIds = new Set<string>();
  for (const [index, template] of contract.templates.entries()) {
    addDuplicateIssue(templateIds, templateId(template), context, ["templates", index], "Key dan versi template harus unik.");
  }

  const themeIds = new Set<string>();
  const defaultThemes = new Map<string, number>();
  for (const [index, theme] of contract.themes.entries()) {
    addDuplicateIssue(themeIds, themeId(theme), context, ["themes", index], "Key dan versi tema harus unik.");
    const ownerTemplateId = themeTemplateId(theme);
    if (!templateIds.has(ownerTemplateId)) {
      context.addIssue({ code: "custom", path: ["themes", index, "templateKey"], message: "Tema harus merujuk template yang tersedia." });
    }
    if (theme.isDefault && theme.status === "active") defaultThemes.set(ownerTemplateId, (defaultThemes.get(ownerTemplateId) ?? 0) + 1);
  }
  for (const [index, template] of contract.templates.entries()) {
    if (template.status === "active" && defaultThemes.get(templateId(template)) !== 1) {
      context.addIssue({ code: "custom", path: ["templates", index], message: "Setiap template aktif harus memiliki tepat satu tema default aktif." });
    }
  }

  const routeIds = new Set<string>();
  const routeSlugs = new Set<string>();
  const routesById = new Map(contract.routes.map((route) => [route.id, route]));
  const routeCountByOwner = new Map<string, number>();
  for (const [index, route] of contract.routes.entries()) {
    addDuplicateIssue(routeIds, route.id, context, ["routes", index, "id"], "ID route harus unik.");
    addDuplicateIssue(routeSlugs, route.slug, context, ["routes", index, "slug"], "Slug route harus unik secara global.");
    if (!userIds.has(route.ownerId)) {
      context.addIssue({ code: "custom", path: ["routes", index, "ownerId"], message: "Owner route harus merujuk user yang tersedia." });
    }
    routeCountByOwner.set(route.ownerId, (routeCountByOwner.get(route.ownerId) ?? 0) + 1);
  }
  for (const [index, user] of contract.users.entries()) {
    if ((routeCountByOwner.get(user.id) ?? 0) > user.routeQuota) {
      context.addIssue({ code: "custom", path: ["users", index, "routeQuota"], message: "Jumlah route teralokasi tidak boleh melebihi kuota owner." });
    }
  }

  const invitationIds = new Set<string>();
  const invitationRouteIds = new Set<string>();
  for (const [index, invitation] of contract.invitations.entries()) {
    addDuplicateIssue(invitationIds, invitation.id, context, ["invitations", index, "id"], "ID undangan harus unik.");
    addDuplicateIssue(invitationRouteIds, invitation.routeId, context, ["invitations", index, "routeId"], "Satu route hanya boleh digunakan satu undangan.");
    if (!userIds.has(invitation.ownerId)) {
      context.addIssue({ code: "custom", path: ["invitations", index, "ownerId"], message: "Owner undangan harus merujuk user yang tersedia." });
    }
    const route = routesById.get(invitation.routeId);
    if (!route) {
      context.addIssue({ code: "custom", path: ["invitations", index, "routeId"], message: "Route undangan harus tersedia." });
    } else if (route.ownerId !== invitation.ownerId) {
      context.addIssue({ code: "custom", path: ["invitations", index, "ownerId"], message: "Owner undangan harus sama dengan owner route." });
    }
    const selectedTemplateId = templateId({ key: invitation.templateKey, version: invitation.templateVersion });
    if (!templateIds.has(selectedTemplateId)) {
      context.addIssue({ code: "custom", path: ["invitations", index, "templateKey"], message: "Template undangan harus tersedia di katalog." });
    }
    const selectedTheme = contract.themes.find((theme) => theme.key === invitation.themeKey && theme.version === invitation.themeVersion);
    if (!selectedTheme) {
      context.addIssue({ code: "custom", path: ["invitations", index, "themeKey"], message: "Tema undangan harus tersedia di katalog." });
    } else if (themeTemplateId(selectedTheme) !== selectedTemplateId) {
      context.addIssue({ code: "custom", path: ["invitations", index, "themeKey"], message: "Tema undangan harus kompatibel dengan template terpilih." });
    }
  }
});

function addDuplicateIssue(values: Set<string>, value: string, context: z.RefinementCtx, path: PropertyKey[], message: string): void {
  if (values.has(value)) context.addIssue({ code: "custom", path, message });
  values.add(value);
}

export type FrontendContract = z.infer<typeof FrontendContractSchema>;
