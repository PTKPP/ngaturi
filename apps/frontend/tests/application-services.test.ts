import { describe, expect, it, vi } from "vitest";
import invitations from "../../../contracts/dummy-data/invitations.json";
import users from "../../../contracts/dummy-data/users.json";
import { InvitationSchema, UsersSchema } from "@/domain";
import type { ApplicationRepository } from "@/repositories/contracts";
import { InvitationApplicationService } from "@/application/invitation-service";
import { AdminApplicationService } from "@/application/admin-service";

const profiles = UsersSchema.parse(users);
const owner = profiles.find((user) => user.role === "user" && user.status === "active")!;
const admin = profiles.find((user) => user.role === "admin")!;
const draft = InvitationSchema.parse(invitations[0]);
const published = InvitationSchema.parse(invitations[1]);

function repositoryFor(records = [draft, published]) {
  const updateInvitation = vi.fn(async (_ownerId: string, invitation: typeof draft) => invitation);
  const repository = {
    findOwnedInvitation: vi.fn(async (ownerId: string, id: string) => records.find((item) => item.id === id && item.ownerId === ownerId) ?? null),
    updateInvitation,
    listThemes: vi.fn(async () => []),
    setRouteQuota: vi.fn(), preassignRoute: vi.fn(), reassignRoute: vi.fn(),
  } as unknown as ApplicationRepository;
  return { repository, updateInvitation };
}

describe("production application service authorization", () => {
  it("does not let a user or admin read another owner's invitation through the owner service", async () => {
    const { repository } = repositoryFor(); const service = new InvitationApplicationService(repository);
    await expect(service.owned(owner, published.id)).rejects.toThrow("bukan milik");
    await expect(service.owned(admin, draft.id)).rejects.toThrow("bukan milik");
  });

  it("rejects published template switching before repository mutation", async () => {
    const { repository, updateInvitation } = repositoryFor();
    await expect(new InvitationApplicationService(repository).switchTemplate(admin, published.id, "minimal-white", 1, true)).rejects.toThrow("berstatus draft");
    expect(updateInvitation).not.toHaveBeenCalled();
  });

  it("validates content before publication and scopes the update to actor ID", async () => {
    const { repository, updateInvitation } = repositoryFor();
    await new InvitationApplicationService(repository).setStatus(owner, draft.id, "published");
    expect(updateInvitation).toHaveBeenCalledWith(owner.id, expect.objectContaining({ id: draft.id, ownerId: owner.id, status: "published", publishedAt: expect.any(String) }));
  });

  it("rejects admin operations for regular users before calling the repository", async () => {
    const { repository } = repositoryFor();
    await expect(new AdminApplicationService(repository).setQuota(owner, owner.id, 2)).rejects.toThrow("hanya dapat dilakukan admin");
    expect(repository.setRouteQuota).not.toHaveBeenCalled();
  });
});
