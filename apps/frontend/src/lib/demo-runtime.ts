import { initializeDemoData, MockInvitationRepository, MockSessionRepository, MockTemplateRepository, MockUserRepository } from "@/repositories/mock";
import { AuthService, InvitationService, UserService } from "@/services";
import type { StoragePort } from "@/repositories/contracts";

export function createDemoRuntime(storage: StoragePort) {
  initializeDemoData(storage);
  const users = new MockUserRepository(storage);
  const sessions = new MockSessionRepository(storage);
  const invitations = new MockInvitationRepository(storage);
  const templates = new MockTemplateRepository(storage);
  return {
    storage, users, sessions, invitations, templates,
    auth: new AuthService(sessions, users),
    invitationService: new InvitationService(invitations, templates),
    userService: new UserService(users),
  };
}

export type DemoRuntime = ReturnType<typeof createDemoRuntime>;
