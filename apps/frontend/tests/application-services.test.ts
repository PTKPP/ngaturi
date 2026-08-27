import { describe, expect, it, vi } from "vitest";
import invitations from "../../../contracts/dummy-data/invitations.json";
import users from "../../../contracts/dummy-data/users.json";
import themes from "../../../contracts/dummy-data/themes.json";
import { InvitationSchema, InvitationThemesSchema, UsersSchema } from "@/domain";
import type { ApplicationRepository } from "@/repositories/contracts";
import { InvitationApplicationService } from "@/application/invitation-service";
import { AdminApplicationService } from "@/application/admin-service";

const profiles = UsersSchema.parse(users);
const owner = profiles.find((user) => user.role === "user" && user.status === "active")!;
const admin = profiles.find((user) => user.role === "admin")!;
const draft = InvitationSchema.parse(invitations[0]);
const published = InvitationSchema.parse(invitations[1]);
const themeCatalogue = InvitationThemesSchema.parse(themes);

function repositoryFor(records = [draft, published]) {
  const updateInvitation = vi.fn(async (_ownerId: string, invitation: typeof draft) => invitation);
  const repository = {
    findOwnedInvitation: vi.fn(async (ownerId: string, id: string) => records.find((item) => item.id === id && item.ownerId === ownerId) ?? null),
    updateInvitation,
    listThemes: vi.fn(async () => themeCatalogue),
    createInvitation: vi.fn(),
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

  it("does not create new invitations from compatibility-only templates", async () => {
    const { repository } = repositoryFor();
    await expect(new InvitationApplicationService(repository).create(owner, {
      title: "Compatibility", slug: "compatibility", categoryKey: "wedding", categoryVersion: 1,
      templateKey: "minimal-white", templateVersion: 1, themeKey: "minimal-white-default", themeVersion: 1,
    })).rejects.toThrow("belum tersedia");
    expect(repository.createInvitation).not.toHaveBeenCalled();
  });

  it("validates content before publication and scopes the update to actor ID", async () => {
    const { repository, updateInvitation } = repositoryFor();
    await new InvitationApplicationService(repository).setStatus(owner, draft.id, "published");
    expect(updateInvitation).toHaveBeenCalledWith(owner.id, expect.objectContaining({ id: draft.id, ownerId: owner.id, status: "published", publishedAt: expect.any(String) }));
  });

  it("writes schema v2 when a legacy draft is explicitly saved", async () => {
    const { repository, updateInvitation } = repositoryFor();
    await new InvitationApplicationService(repository).save(owner, draft);
    expect(updateInvitation).toHaveBeenCalledWith(owner.id, expect.objectContaining({ contentSchemaVersion: 2, content: expect.objectContaining({ modules: expect.any(Object), moduleVersions: expect.any(Object) }) }));
  });

  it("keeps legacy content byte-for-byte stable for a theme-only change", async () => {
    const { repository, updateInvitation } = repositoryFor();
    await new InvitationApplicationService(repository).save(owner, { ...draft, themeKey: "minimal-white-sage" });
    expect(updateInvitation).toHaveBeenCalledWith(owner.id, expect.objectContaining({ contentSchemaVersion: 1, content: draft.content, themeKey: "minimal-white-sage" }));
  });

  it("does not silently convert an already-published legacy invitation when unpublishing", async () => {
    const { repository, updateInvitation } = repositoryFor();
    await new InvitationApplicationService(repository).setStatus(admin, published.id, "inactive");
    expect(updateInvitation).toHaveBeenCalledWith(admin.id, expect.objectContaining({ contentSchemaVersion: 1, content: published.content, status: "inactive" }));
  });

  it("does not silently convert unchanged content when saving a published legacy invitation", async () => {
    const { repository, updateInvitation } = repositoryFor();
    await new InvitationApplicationService(repository).save(admin, published);
    expect(updateInvitation).toHaveBeenCalledWith(admin.id, expect.objectContaining({ contentSchemaVersion: 1, content: published.content, status: "published" }));
  });

  it("rejects admin operations for regular users before calling the repository", async () => {
    const { repository } = repositoryFor();
    await expect(new AdminApplicationService(repository).setQuota(owner, owner.id, 2)).rejects.toThrow("hanya dapat dilakukan admin");
    expect(repository.setRouteQuota).not.toHaveBeenCalled();
  });
});
