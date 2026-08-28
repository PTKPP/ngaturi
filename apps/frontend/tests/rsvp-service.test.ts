import { describe, expect, it, vi } from "vitest";
import users from "../../../contracts/dummy-data/users.json";
import { UsersSchema } from "@/domain";
import { InvitationRsvpService } from "@/application/rsvp-service";
import type { InvitationRsvpRepository } from "@/repositories/contracts";

vi.mock("server-only", () => ({}));

const owner = UsersSchema.parse(users).find((user) => user.role === "user" && user.status === "active")!;
const invitationId = "3e531e88-863c-4344-baf4-c3d8349f13db";
const submissionId = "ad52429b-7dc7-4fae-b49a-89d93eaa9abd";
const sourceHash = "a".repeat(64);

function repository(): InvitationRsvpRepository {
  return {
    submit: vi.fn(async () => ({ id: "7ab6d9dc-73ef-4da8-8e70-713a0cc53b30", submittedAt: "2026-08-28T00:00:00.000Z", idempotent: false })),
    getOwnedSummary: vi.fn(async () => ({ attending: 2, notAttending: 1, attendingGuestCount: 5, totalResponses: 3 })),
    listOwned: vi.fn(async () => []),
  };
}

describe("RSVP application service", () => {
  it("normalizes guest input before crossing the repository boundary", async () => {
    const adapter = repository();
    await new InvitationRsvpService(adapter).submitGuest({
      invitationId,
      clientSubmissionId: submissionId,
      guestName: "  Tamu   Satu  ",
      attendanceStatus: "attending",
      guestCount: 2,
      note: "  Bersama   keluarga. ",
      website: "",
    }, sourceHash);
    expect(adapter.submit).toHaveBeenCalledWith({ invitationId, clientSubmissionId: submissionId, guestName: "Tamu Satu", attendanceStatus: "attending", guestCount: 2, note: "Bersama keluarga.", sourceHash });
  });

  it("rejects invalid guest count, text, honeypot, and source hash server-side", async () => {
    const adapter = repository();
    const base = { invitationId, clientSubmissionId: submissionId, guestName: "Tamu", attendanceStatus: "not_attending", guestCount: 0, note: "", website: "" };
    await expect(new InvitationRsvpService(adapter).submitGuest({ ...base, guestCount: 1 }, sourceHash)).rejects.toThrow();
    await expect(new InvitationRsvpService(adapter).submitGuest({ ...base, guestName: "A" }, sourceHash)).rejects.toThrow();
    await expect(new InvitationRsvpService(adapter).submitGuest({ ...base, website: "spam.example" }, sourceHash)).rejects.toThrow();
    await expect(new InvitationRsvpService(adapter).submitGuest(base, "invalid")).rejects.toThrow("rate limit");
    expect(adapter.submit).not.toHaveBeenCalled();
  });

  it("loads owner summary and response list through one authorized service boundary", async () => {
    const adapter = repository();
    const result = await new InvitationRsvpService(adapter).getOwnerDashboard(owner, invitationId);
    expect(result.summary).toEqual({ attending: 2, notAttending: 1, attendingGuestCount: 5, totalResponses: 3 });
    expect(adapter.getOwnedSummary).toHaveBeenCalledWith(owner.id, invitationId);
    expect(adapter.listOwned).toHaveBeenCalledWith(owner.id, invitationId, 100, 0);
  });
});
