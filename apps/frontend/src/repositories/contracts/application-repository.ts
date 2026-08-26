import type { Invitation, InvitationRoute, InvitationTemplate, InvitationTheme, User } from "@/domain";

export interface RouteUsage { used: number; quota: number; remaining: number; }
export interface OwnedRoute { route: InvitationRoute; invitationId: string | null; }

export interface ApplicationRepository {
  listProfiles(): Promise<User[]>;
  listOwnedRoutes(ownerId: string): Promise<OwnedRoute[]>;
  routeUsage(owner: Pick<User, "id" | "routeQuota">): Promise<RouteUsage>;
  listOwnedInvitations(ownerId: string): Promise<Invitation[]>;
  findOwnedInvitation(ownerId: string, id: string): Promise<Invitation | null>;
  findPublishedInvitation(slug: string): Promise<Invitation | null>;
  listTemplates(): Promise<InvitationTemplate[]>;
  listThemes(): Promise<InvitationTheme[]>;
  createInvitation(ownerId: string, input: { routeId?: string; slug?: string; title: string; categoryKey: string; categoryVersion: number; templateKey: string; templateVersion: number; contentSchemaVersion: number; themeKey: string; themeVersion: number; themeOverrides: Record<string, unknown>; content: Record<string, unknown> }): Promise<Invitation>;
  updateInvitation(ownerId: string, invitation: Invitation): Promise<Invitation>;
  preassignRoute(ownerId: string, slug: string): Promise<InvitationRoute>;
  reassignRoute(routeId: string, slug: string, confirmed: boolean): Promise<InvitationRoute>;
  setRouteQuota(ownerId: string, quota: number): Promise<User>;
}
