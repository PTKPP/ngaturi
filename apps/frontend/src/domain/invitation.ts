import { z } from "zod";
import { InvitationCategoryKeySchema } from "@/invitation-categories/registry";
import { ThemeOverridesSchema } from "./theme";

export const InvitationStatusSchema = z.enum(["draft", "published", "inactive"]);
export const InvitationSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  routeId: z.string().min(1),
  title: z.string().trim().min(1),
  categoryKey: InvitationCategoryKeySchema.default("wedding"),
  categoryVersion: z.number().int().positive().default(1),
  templateKey: z.string().trim().min(1),
  templateVersion: z.number().int().positive(),
  contentSchemaVersion: z.number().int().positive(),
  themeKey: z.string().trim().min(1),
  themeVersion: z.number().int().positive(),
  themeOverrides: ThemeOverridesSchema.default({}),
  status: InvitationStatusSchema,
  content: z.record(z.string(), z.unknown()),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).superRefine((invitation, context) => {
  if (invitation.status === "published" && !invitation.publishedAt) {
    context.addIssue({ code: "custom", path: ["publishedAt"], message: "Undangan terbit harus memiliki waktu publikasi." });
  }
  if (invitation.status !== "published" && invitation.publishedAt) {
    context.addIssue({ code: "custom", path: ["publishedAt"], message: "Waktu publikasi hanya boleh ada pada undangan terbit." });
  }
});

export const InvitationsSchema = z.array(InvitationSchema);
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;
export type Invitation = z.infer<typeof InvitationSchema>;
