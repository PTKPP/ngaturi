import { initializeDemoData, MockInvitationRepository, MockRouteRepository, MockSessionRepository, MockTemplateRepository, MockThemeRepository, MockUserRepository } from "@/repositories/mock";
import { AuthService, InvitationService, RouteService, UserService } from "@/services";
import type { StoragePort } from "@/repositories/contracts";

export function createDemoRuntime(storage: StoragePort) {
  initializeDemoData(storage);
  const users = new MockUserRepository(storage);
  const sessions = new MockSessionRepository(storage);
  const invitations = new MockInvitationRepository(storage);
  const routes = new MockRouteRepository(storage);
  const templates = new MockTemplateRepository(storage);
  const themes = new MockThemeRepository(storage);
  return {
    storage, users, sessions, invitations, routes, templates, themes,
    auth: new AuthService(sessions, users),
    invitationService: new InvitationService(invitations, routes, templates, themes, users),
    routeService: new RouteService(routes, invitations, users),
    userService: new UserService(users, routes),
  };
}

export type DemoRuntime = ReturnType<typeof createDemoRuntime>;
