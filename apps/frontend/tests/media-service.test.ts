import { describe, expect, it, vi } from "vitest";
import users from "../../../contracts/dummy-data/users.json";
import { UsersSchema } from "@/domain";
import { InvitationMediaService } from "@/application/media-service";
import type { InvitationMediaRepository } from "@/repositories/contracts";

vi.mock("server-only", () => ({}));

const owner = UsersSchema.parse(users).find((user) => user.role === "user" && user.status === "active")!;

function repository(owned: boolean) {
  return {
    invitationOwnedBy: vi.fn(async () => owned),
    uploadImage: vi.fn(async () => ({ id: "media-1", storagePath: `${owner.id}/invitation/media.webp` })),
    removeImage: vi.fn(async () => undefined),
  } satisfies InvitationMediaRepository;
}

describe("invitation media application boundary", () => {
  it("rejects foreign invitations before touching storage", async () => {
    const adapter = repository(false);
    await expect(new InvitationMediaService(adapter).uploadImage(owner, "foreign", new File(["image"], "image.webp", { type: "image/webp" }), "Foto pasangan")).rejects.toThrow("bukan milik");
    expect(adapter.uploadImage).not.toHaveBeenCalled();
  });

  it("validates image policy and forwards normalized owner-scoped input", async () => {
    const adapter = repository(true);
    const file = new File(["image"], "image.webp", { type: "image/webp" });
    await new InvitationMediaService(adapter).uploadImage(owner, "invitation-1", file, "  Foto pasangan  ");
    expect(adapter.uploadImage).toHaveBeenCalledWith({ ownerId: owner.id, invitationId: "invitation-1", file, altText: "Foto pasangan" });
  });
});
