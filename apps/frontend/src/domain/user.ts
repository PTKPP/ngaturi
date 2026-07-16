import { z } from "zod";

export const UserRoleSchema = z.enum(["admin", "user"]);
export const UserStatusSchema = z.enum(["active", "inactive"]);

export const UserSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UsersSchema = z.array(UserSchema);
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;
export type User = z.infer<typeof UserSchema>;
