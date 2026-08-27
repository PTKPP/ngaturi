import { UserSchema, type Session, type User, type UserRole } from "@/domain";
import type { RouteRepository, UserRepository } from "@/repositories/contracts";
import { assertAdminSession } from "./authorization";
import { createPrototypeId } from "./id";

export class UserService {
  constructor(private readonly users: UserRepository, private readonly routes: RouteRepository) {}
  list(query = "", status = "all"): User[] {
    const needle = query.trim().toLowerCase();
    return this.users.list().filter((user) =>
      (status === "all" || user.status === status) && (!needle || `${user.name} ${user.email}`.toLowerCase().includes(needle))
    );
  }
  create(session: Session, input: { name: string; email: string; role: UserRole; routeQuota: number }): User {
    assertAdminSession(session, this.users);
    if (this.users.findByEmail(input.email)) throw new Error("Email sudah digunakan.");
    const now = new Date().toISOString();
    return this.users.create(UserSchema.parse({
      id: createPrototypeId("usr_demo"), name: input.name, email: input.email, role: input.role,
      status: "active", routeQuota: input.routeQuota, createdAt: now, updatedAt: now,
    }));
  }
  setRouteQuota(session: Session, id: string, routeQuota: number): User {
    assertAdminSession(session, this.users);
    const user = this.users.findById(id);
    if (!user) throw new Error("User tidak ditemukan.");
    if (!Number.isInteger(routeQuota) || routeQuota < 0) throw new Error("Kuota route harus berupa bilangan bulat non-negatif.");
    const used = this.routes.list().filter((route) => route.ownerId === id).length;
    if (routeQuota < used) throw new Error(`Kuota route tidak boleh lebih kecil dari ${used} route yang sudah dialokasikan.`);
    return this.users.update(UserSchema.parse({ ...user, routeQuota, updatedAt: new Date().toISOString() }));
  }
  toggleStatus(session: Session, id: string): User {
    assertAdminSession(session, this.users);
    const user = this.users.findById(id);
    if (!user) throw new Error("User tidak ditemukan.");
    if (user.id === session.userId && user.status === "active") throw new Error("Admin tidak dapat menonaktifkan session sendiri.");
    return this.users.update({ ...user, status: user.status === "active" ? "inactive" : "active", updatedAt: new Date().toISOString() });
  }
}
