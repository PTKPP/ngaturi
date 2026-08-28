import { beforeEach, describe, expect, it, vi } from "vitest";
import { RsvpDomainError } from "@/repositories/contracts";

const mocks = vi.hoisted(() => ({
  submit: vi.fn(),
  getOwnedSummary: vi.fn(),
  listOwned: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-real-ip": "203.0.113.7", "user-agent": "RSVP test browser" }) }));
vi.mock("@/repositories/supabase", () => ({ createInvitationRsvpRepository: () => mocks }));

import { submitRsvpAction } from "@/app/actions/rsvp";

const input = {
  invitationId: "3e531e88-863c-4344-baf4-c3d8349f13db",
  clientSubmissionId: "ad52429b-7dc7-4fae-b49a-89d93eaa9abd",
  guestName: "Tamu Satu",
  attendanceStatus: "attending",
  guestCount: 2,
  note: "Sampai bertemu",
  website: "",
};

describe("RSVP Server Action boundary", () => {
  beforeEach(() => {
    process.env.RSVP_RATE_LIMIT_SECRET = "local-test-secret";
    mocks.submit.mockReset();
    mocks.submit.mockResolvedValue({ id: "7ab6d9dc-73ef-4da8-8e70-713a0cc53b30", submittedAt: "2026-08-28T00:00:00.000Z", idempotent: false });
  });

  it("hashes request identity server-side and returns a serializable success", async () => {
    await expect(submitRsvpAction(input)).resolves.toEqual({ ok: true, submittedAt: "2026-08-28T00:00:00.000Z", idempotent: false });
    const sourceHash = mocks.submit.mock.calls[0][0].sourceHash;
    expect(sourceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(sourceHash).not.toContain("203.0.113.7");
  });

  it("maps rate limiting to a user-friendly result instead of throwing into the invitation", async () => {
    mocks.submit.mockRejectedValueOnce(new RsvpDomainError("RSVP_RATE_LIMITED", "Terlalu banyak percobaan. Silakan tunggu beberapa menit lalu coba lagi."));
    await expect(submitRsvpAction(input)).resolves.toEqual(expect.objectContaining({ ok: false, code: "RSVP_RATE_LIMITED" }));
  });
});
