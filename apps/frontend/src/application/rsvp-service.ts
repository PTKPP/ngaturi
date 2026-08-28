import "server-only";

import type { User } from "@/domain";
import { GuestRsvpSubmissionSchema } from "@/rsvp/schema";
import type { InvitationRsvpRepository } from "@/repositories/contracts";

const SOURCE_HASH = /^[0-9a-f]{64}$/;

export class InvitationRsvpService {
  constructor(private readonly repository: InvitationRsvpRepository) {}

  async submitGuest(candidate: unknown, sourceHash: string) {
    if (!SOURCE_HASH.test(sourceHash)) throw new Error("Identitas rate limit RSVP tidak valid.");
    const input = GuestRsvpSubmissionSchema.parse(candidate);
    return this.repository.submit({
      invitationId: input.invitationId,
      clientSubmissionId: input.clientSubmissionId,
      guestName: input.guestName,
      attendanceStatus: input.attendanceStatus,
      guestCount: input.guestCount,
      note: input.note,
      sourceHash,
    });
  }

  async getOwnerDashboard(actor: User, invitationId: string, limit = 100, offset = 0) {
    if (actor.status !== "active") throw new Error("Akun tidak aktif.");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) throw new Error("Pagination RSVP tidak valid.");
    const [summary, responses] = await Promise.all([
      this.repository.getOwnedSummary(actor.id, invitationId),
      this.repository.listOwned(actor.id, invitationId, limit, offset),
    ]);
    return { summary, responses };
  }
}
