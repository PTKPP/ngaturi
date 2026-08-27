import { InvitationRouteSchema, InvitationRoutesSchema, type InvitationRoute } from "@/domain";
import type { RouteRepository, StoragePort } from "../contracts";
import { STORAGE_KEYS } from "./keys";
import { readValidated, writeValidated } from "./storage";

export class MockRouteRepository implements RouteRepository {
  constructor(private readonly storage: StoragePort) {}
  list(): InvitationRoute[] { return readValidated(this.storage, STORAGE_KEYS.routes, InvitationRoutesSchema); }
  findById(id: string): InvitationRoute | null { return this.list().find((item) => item.id === id) ?? null; }
  findBySlug(slug: string): InvitationRoute | null { return this.list().find((item) => item.slug === slug) ?? null; }
  create(route: InvitationRoute): InvitationRoute {
    const parsed = InvitationRouteSchema.parse(route);
    writeValidated(this.storage, STORAGE_KEYS.routes, InvitationRoutesSchema, [...this.list(), parsed]);
    return parsed;
  }
  update(route: InvitationRoute): InvitationRoute {
    const parsed = InvitationRouteSchema.parse(route);
    const routes = this.list();
    if (!routes.some((item) => item.id === parsed.id)) throw new Error("Route tidak ditemukan.");
    writeValidated(this.storage, STORAGE_KEYS.routes, InvitationRoutesSchema, routes.map((item) => item.id === parsed.id ? parsed : item));
    return parsed;
  }
  delete(id: string): void { writeValidated(this.storage, STORAGE_KEYS.routes, InvitationRoutesSchema, this.list().filter((item) => item.id !== id)); }
}
