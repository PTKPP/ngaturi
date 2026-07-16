import { z } from "zod";
import { UserRoleSchema } from "./user";

export const SessionSchema = z.object({
  userId: z.string().min(1),
  role: UserRoleSchema,
  createdAt: z.string().datetime(),
});

export const MockCredentialSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(1),
});

export const MockCredentialsSchema = z.array(MockCredentialSchema);
export type Session = z.infer<typeof SessionSchema>;
export type MockCredential = z.infer<typeof MockCredentialSchema>;
