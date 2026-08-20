import { z } from "zod";

export const RouteAssignedBySchema = z.enum(["admin", "user", "migration"]);
export const InvitationRouteSchema = z.object({
  id: z.string().min(1), ownerId: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  assignedBy: RouteAssignedBySchema,
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
export const InvitationRoutesSchema = z.array(InvitationRouteSchema);
export type RouteAssignedBy = z.infer<typeof RouteAssignedBySchema>;
export type InvitationRoute = z.infer<typeof InvitationRouteSchema>;
