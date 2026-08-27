import type { InvitationRoute } from "@/domain";

export interface RouteRepository {
  list(): InvitationRoute[];
  findById(id: string): InvitationRoute | null;
  findBySlug(slug: string): InvitationRoute | null;
  create(route: InvitationRoute): InvitationRoute;
  update(route: InvitationRoute): InvitationRoute;
  delete(id: string): void;
}
