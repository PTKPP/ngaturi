import type { Session, User } from "@/domain";
import type { UserRepository } from "@/repositories/contracts";

export function assertValidSession(session: Session, users: UserRepository): User {
  const user = users.findById(session.userId);
  if (!user || user.status !== "active" || user.role !== session.role) throw new Error("Session demo tidak lagi valid. Silakan masuk kembali.");
  return user;
}
export function assertAdminSession(session: Session, users: UserRepository): User {
  const user = assertValidSession(session, users);
  if (user.role !== "admin") throw new Error("Operasi ini hanya dapat dilakukan admin.");
  return user;
}
