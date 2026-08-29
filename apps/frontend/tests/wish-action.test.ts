import { beforeEach, describe, expect, it, vi } from "vitest";
import users from "../../../contracts/dummy-data/users.json";
import { UsersSchema } from "@/domain";
import { WishDomainError } from "@/repositories/contracts";

const owner = UsersSchema.parse(users).find((user) => user.role === "user" && user.status === "active")!;
const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  listPublic: vi.fn(),
  getOwnedSummary: vi.fn(),
  listOwned: vi.fn(),
  moderate: vi.fn(),
  requireProfile: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.8", "user-agent": "Wishes test browser" }) }));
vi.mock("@/application/auth", () => ({ requireProfile: mocks.requireProfile }));
vi.mock("@/repositories/supabase", () => ({ createInvitationWishRepository: () => mocks }));

import { listApprovedWishesAction, listOwnedWishesAction, moderateWishAction, submitWishAction } from "@/app/actions/wishes";

const invitationId = "3e531e88-863c-4344-baf4-c3d8349f13db";
const wishId = "ad52429b-7dc7-4fae-b49a-89d93eaa9abd";
const input = { invitationId, clientSubmissionId: wishId, guestName: "Tamu Satu", message: "Doa terbaik", website: "" };

describe("Wishes Server Action boundaries", () => {
  beforeEach(() => {
    process.env.NGATURI_TRUSTED_PROXY_HOPS = "1";
    process.env.GUEST_SUBMISSION_RATE_LIMIT_SECRET = "local-wishes-test-secret";
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.requireProfile.mockResolvedValue(owner);
    mocks.submit.mockResolvedValue({ id: wishId, submittedAt: "2026-08-29T00:00:00.000Z", idempotent: false });
    mocks.listPublic.mockResolvedValue([]);
    mocks.getOwnedSummary.mockResolvedValue({ pending: 1, approved: 0, rejected: 0, total: 1 });
    mocks.listOwned.mockResolvedValue([]);
    mocks.moderate.mockResolvedValue({ id: wishId, status: "approved", updatedAt: "2026-08-29T01:00:00.000Z" });
  });

  it("hashes the trusted request identity and returns serializable guest results", async () => {
    await expect(submitWishAction(input)).resolves.toEqual({ ok: true, submittedAt: "2026-08-29T00:00:00.000Z", idempotent: false });
    const hash = mocks.submit.mock.calls[0][0].sourceHash;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203.0.113.8");
    await expect(listApprovedWishesAction({ invitationId, cursor: null })).resolves.toEqual({ ok: true, items: [], nextCursor: null });
  });

  it("maps rate-limit and moderation conflicts to friendly non-throwing results", async () => {
    mocks.submit.mockRejectedValueOnce(new WishDomainError("WISH_RATE_LIMITED", "Terlalu banyak ucapan dikirim."));
    await expect(submitWishAction(input)).resolves.toEqual(expect.objectContaining({ ok: false, code: "WISH_RATE_LIMITED" }));
    mocks.moderate.mockRejectedValueOnce(new WishDomainError("WISH_MODERATION_CONFLICT", "Status ucapan sudah berubah."));
    await expect(moderateWishAction({ invitationId, wishId, status: "approved", expectedUpdatedAt: "2026-08-29T00:00:00.000Z" })).resolves.toEqual(expect.objectContaining({ ok: false, code: "WISH_MODERATION_CONFLICT" }));
  });

  it("reauthenticates owner list and moderation actions", async () => {
    await listOwnedWishesAction({ invitationId, status: "pending", offset: 0 });
    await moderateWishAction({ invitationId, wishId, status: "approved", expectedUpdatedAt: "2026-08-29T00:00:00.000Z" });
    expect(mocks.requireProfile).toHaveBeenCalledTimes(2);
    expect(mocks.getOwnedSummary).toHaveBeenCalledWith(owner.id, invitationId);
    expect(mocks.moderate).toHaveBeenCalledWith(owner.id, expect.objectContaining({ wishId }));
  });
});
