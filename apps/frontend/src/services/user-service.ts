import { UserSchema, type Session, type User, type UserRole } from "@/domain";
import type { UserRepository } from "@/repositories/contracts";

export class UserService {
  constructor(private readonly users: UserRepository) {}
  list(query = "", status = "all"): User[] {
    const needle = query.trim().toLowerCase();
    return this.users.list().filter((user) =>
      (status === "all" || user.status === status) && (!needle || `${user.name} ${user.email}`.toLowerCase().includes(needle))
    );
  }
  create(input: { name: string; email: string; role: UserRole }): User {
    if (this.users.findByEmail(input.email)) throw new Error("Email sudah digunakan.");
    const now = new Date().toISOString();
    return this.users.create(UserSchema.parse({ id: `usr_demo_${Date.now()}`, name: input.name, email: input.email, role: input.role, status: "active", createdAt: now, updatedAt: now }));
  }
  toggleStatus(session: Session, id: string): User {
    const user = this.users.findById(id);
    if (!user) throw new Error("User tidak ditemukan.");
    if (user.id === session.userId && user.status === "active") throw new Error("Admin tidak dapat menonaktifkan session sendiri.");
    return this.users.update({ ...user, status: user.status === "active" ? "inactive" : "active", updatedAt: new Date().toISOString() });
  }
}
