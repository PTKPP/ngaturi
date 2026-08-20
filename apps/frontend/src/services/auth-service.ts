import { type Session } from "@/domain";
import type { SessionRepository, UserRepository } from "@/repositories/contracts";

export class AuthService {
  constructor(private readonly sessions: SessionRepository, private readonly users: UserRepository) {}

  login(email: string, password: string): Session {
    const user = this.users.findByEmail(email);
    if (!user) throw new Error("Email atau password demo salah.");
    const credential = this.sessions.listCredentials().find((item) => item.userId === user.id);
    if (!credential || credential.password !== password) throw new Error("Email atau password demo salah.");
    if (user.status !== "active") throw new Error("Akun demo ini sedang nonaktif.");
    const session: Session = { userId: user.id, role: user.role, createdAt: new Date().toISOString() };
    this.sessions.save(session);
    return session;
  }

  logout(): void { this.sessions.clear(); }
  current(): Session | null {
    const session = this.sessions.get();
    if (!session) return null;
    const user = this.users.findById(session.userId);
    if (!user || user.status !== "active" || user.role !== session.role) { this.sessions.clear(); return null; }
    return session;
  }
}

export function canAccessPath(session: Session | null, path: string): boolean {
  if (path.startsWith("/admin")) return session?.role === "admin";
  if (path.startsWith("/dashboard")) return session !== null;
  return true;
}
