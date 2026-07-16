import { z } from "zod";
import { InvitationsSchema } from "./invitation";
import { TemplatesSchema, templateId } from "./template";
import { UsersSchema } from "./user";

export const FrontendContractSchema = z.object({
  users: UsersSchema,
  templates: TemplatesSchema,
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
    addDuplicateIssue(
      templateIds,
      templateId(template),
      context,
      ["templates", index],
      "Key dan versi template harus unik.",
    );
  }

  const invitationIds = new Set<string>();
  const invitationSlugs = new Set<string>();
  for (const [index, invitation] of contract.invitations.entries()) {
    addDuplicateIssue(
      invitationIds,
      invitation.id,
      context,
      ["invitations", index, "id"],
      "ID undangan harus unik.",
    );
    addDuplicateIssue(
      invitationSlugs,
      invitation.slug,
      context,
      ["invitations", index, "slug"],
      "Slug undangan harus unik.",
    );
    if (!userIds.has(invitation.ownerId)) {
      context.addIssue({
        code: "custom",
        path: ["invitations", index, "ownerId"],
        message: "Owner undangan harus merujuk user yang tersedia.",
      });
    }
    const invitationTemplateId = templateId({ key: invitation.templateKey, version: invitation.templateVersion });
    if (!templateIds.has(invitationTemplateId)) {
      context.addIssue({
        code: "custom",
        path: ["invitations", index, "templateKey"],
        message: "Template undangan harus tersedia di katalog.",
      });
    }
  }
});

function addDuplicateIssue(
  values: Set<string>,
  value: string,
  context: z.RefinementCtx,
  path: PropertyKey[],
  message: string,
): void {
  if (values.has(value)) context.addIssue({ code: "custom", path, message });
  values.add(value);
}

export type FrontendContract = z.infer<typeof FrontendContractSchema>;
