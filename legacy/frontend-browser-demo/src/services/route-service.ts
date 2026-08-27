import { InvitationRouteSchema, type InvitationRoute, type Session } from "@/domain";
import type { InvitationRepository, RouteRepository, UserRepository } from "@/repositories/contracts";
import { assertAdminSession, assertValidSession } from "./authorization";
import { createPrototypeId } from "./id";
import { assertAllowedSlug, normalizeSlug, RESERVED_SLUGS } from "./slug";

export interface RouteUsage { used: number; quota: number; remaining: number; }
export interface RouteWithUsage { route: InvitationRoute; invitationId: string | null; }

export class RouteService {
  constructor(private readonly routes: RouteRepository, private readonly invitations: InvitationRepository, private readonly users: UserRepository) {}
  listOwned(session: Session): RouteWithUsage[] {
    assertValidSession(session, this.users);
    return this.routes.list().filter((route) => route.ownerId === session.userId).map((route) => ({ route, invitationId: this.invitations.findByRouteId(route.id)?.id ?? null }));
  }
  getOwned(session: Session, routeId: string): InvitationRoute {
    assertValidSession(session, this.users);
    const route = this.routes.findById(routeId);
    if (!route || route.ownerId !== session.userId) throw new Error("Route tidak ditemukan atau bukan milik Anda.");
    return route;
  }
  usage(session: Session): RouteUsage {
    const user = assertValidSession(session, this.users);
    const used = this.routes.list().filter((route) => route.ownerId === user.id).length;
    return { used, quota: user.routeQuota, remaining: Math.max(0, user.routeQuota - used) };
  }
  listForUser(session: Session, ownerId: string): RouteWithUsage[] {
    assertAdminSession(session, this.users);
    if (!this.users.findById(ownerId)) throw new Error("User tidak ditemukan.");
    return this.routes.list().filter((route) => route.ownerId === ownerId).map((route) => ({ route, invitationId: this.invitations.findByRouteId(route.id)?.id ?? null }));
  }
  usageForUser(session: Session, ownerId: string): RouteUsage {
    assertAdminSession(session, this.users);
    const user = this.users.findById(ownerId);
    if (!user) throw new Error("User tidak ditemukan.");
    const used = this.routes.list().filter((route) => route.ownerId === ownerId).length;
    return { used, quota: user.routeQuota, remaining: Math.max(0, user.routeQuota - used) };
  }
  preassign(session: Session, ownerId: string, rawSlug: string): InvitationRoute {
    assertAdminSession(session, this.users);
    const owner = this.users.findById(ownerId);
    if (!owner) throw new Error("User tidak ditemukan.");
    const used = this.routes.list().filter((route) => route.ownerId === ownerId).length;
    if (used >= owner.routeQuota) throw new Error("Kuota route user sudah penuh.");
    const slug = validateRouteSlug(rawSlug);
    if (this.routes.findBySlug(slug)) throw new Error("Slug route sudah digunakan.");
    const now = new Date().toISOString();
    return this.routes.create(InvitationRouteSchema.parse({ id: createPrototypeId("route"), ownerId, slug, assignedBy: "admin", createdAt: now, updatedAt: now }));
  }
  reassign(session: Session, routeId: string, rawSlug: string): InvitationRoute {
    assertAdminSession(session, this.users);
    const route = this.routes.findById(routeId);
    if (!route) throw new Error("Route tidak ditemukan.");
    const slug = validateRouteSlug(rawSlug);
    const duplicate = this.routes.findBySlug(slug);
    if (duplicate && duplicate.id !== route.id) throw new Error("Slug route sudah digunakan.");
    return this.routes.update({ ...route, slug, updatedAt: new Date().toISOString() });
  }
}

export function validateRouteSlug(value: string): string {
  const raw = value.trim().toLowerCase();
  if (raw.includes("&")) throw new Error("Slug tidak boleh menggunakan karakter &.");
  if (RESERVED_SLUGS.has(raw)) throw new Error("Slug tersebut dicadangkan oleh aplikasi.");
  const slug = normalizeSlug(raw);
  assertAllowedSlug(slug);
  return slug;
}
