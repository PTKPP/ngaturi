import { describe, expect, it, vi } from "vitest";
import users from "../../../contracts/dummy-data/users.json";
import { UsersSchema } from "@/domain";
import { InvitationWishService } from "@/application/wish-service";
import type { InvitationWishRepository } from "@/repositories/contracts";

vi.mock("server-only", () => ({}));

const owner = UsersSchema.parse(users).find((user) => user.role === "user" && user.status === "active")!;
const invitationId = "3e531e88-863c-4344-baf4-c3d8349f13db";
const submissionId = "ad52429b-7dc7-4fae-b49a-89d93eaa9abd";
const sourceHash = "a".repeat(64);

function repository(): InvitationWishRepository {
  return {
    submit: vi.fn(async () => ({ id: "7ab6d9dc-73ef-4da8-8e70-713a0cc53b30", submittedAt: "2026-08-29T00:00:00.000Z", idempotent: false })),
    listPublic: vi.fn(async () => []),
    getOwnedSummary: vi.fn(async () => ({ pending: 2, approved: 3, rejected: 1, total: 6 })),
    listOwned: vi.fn(async () => []),
    moderate: vi.fn(async (_ownerId, input) => ({ id: input.wishId, status: input.status, updatedAt: "2026-08-29T01:00:00.000Z" })),
  };
}

describe("Wishes application service", () => {
  it("normalizes and validates guest input before crossing the repository boundary", async () => {
    const adapter = repository();
    await new InvitationWishService(adapter).submitGuest({
      invitationId,
      clientSubmissionId: submissionId,
      guestName: "  Tamu   Satu  ",
      message: "  Semoga   selalu bahagia. ",
      website: "",
    }, sourceHash);
    expect(adapter.submit).toHaveBeenCalledWith({ invitationId, clientSubmissionId: submissionId, guestName: "Tamu Satu", message: "Semoga selalu bahagia.", sourceHash });
  });

  it("rejects invalid text, honeypot, and source fingerprint server-side", async () => {
    const adapter = repository();
    const base = { invitationId, clientSubmissionId: submissionId, guestName: "Tamu", message: "Doa terbaik", website: "" };
    await expect(new InvitationWishService(adapter).submitGuest({ ...base, guestName: "A" }, sourceHash)).rejects.toThrow();
    await expect(new InvitationWishService(adapter).submitGuest({ ...base, message: "A" }, sourceHash)).rejects.toThrow();
    await expect(new InvitationWishService(adapter).submitGuest({ ...base, website: "spam.example" }, sourceHash)).rejects.toThrow();
    await expect(new InvitationWishService(adapter).submitGuest(base, "invalid")).rejects.toThrow("rate limit");
    expect(adapter.submit).not.toHaveBeenCalled();
  });

  it("uses bounded cursor pagination for approved public wishes", async () => {
    const adapter = repository();
    const records = Array.from({ length: 11 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      guestName: `Tamu ${index}`,
      message: `Ucapan ${index}`,
      createdAt: `2026-08-29T00:${String(20 - index).padStart(2, "0")}:00.000Z`,
    }));
    vi.mocked(adapter.listPublic).mockResolvedValueOnce(records);
    const result = await new InvitationWishService(adapter).listPublic({ invitationId, cursor: null });
    expect(result.items).toHaveLength(10);
    expect(result.nextCursor).toEqual({ createdAt: records[9].createdAt, id: records[9].id });
    expect(adapter.listPublic).toHaveBeenCalledWith({ invitationId, limit: 11, cursor: null });
  });

  it("loads owner status projection and moderates through the authorized actor boundary", async () => {
    const adapter = repository();
    const service = new InvitationWishService(adapter);
    const dashboard = await service.getOwnerDashboard(owner, invitationId, "approved", 0);
    expect(dashboard.summary.total).toBe(6);
    expect(adapter.listOwned).toHaveBeenCalledWith(owner.id, invitationId, "approved", 50, 0);
    await service.moderate(owner, { invitationId, wishId: submissionId, status: "rejected", expectedUpdatedAt: "2026-08-29T00:00:00.000Z" });
    expect(adapter.moderate).toHaveBeenCalledWith(owner.id, expect.objectContaining({ wishId: submissionId, status: "rejected" }));
  });
});
