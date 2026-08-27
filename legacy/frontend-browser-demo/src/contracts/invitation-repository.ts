import type { Invitation } from "@/domain";

export interface InvitationRepository {
  list(): Invitation[];
  findById(id: string): Invitation | null;
  findByRouteId(routeId: string): Invitation | null;
  create(invitation: Invitation): Invitation;
  update(invitation: Invitation): Invitation;
  delete(id: string): void;
}
