import "server-only";

import type { User } from "@/domain";
import type { InvitationWishRepository } from "@/repositories/contracts";
import {
  GuestWishSubmissionSchema,
  ModerateWishSchema,
  OwnedWishListSchema,
  PublicWishListSchema,
  type WishStatus,
} from "@/wishes/schema";

const SOURCE_HASH = /^[0-9a-f]{64}$/;
const PUBLIC_PAGE_SIZE = 10;
const OWNER_PAGE_SIZE = 50;

export class InvitationWishService {
  constructor(private readonly repository: InvitationWishRepository) {}

  async submitGuest(candidate: unknown, sourceHash: string) {
    if (!SOURCE_HASH.test(sourceHash)) throw new Error("Identitas rate limit ucapan tidak valid.");
    const input = GuestWishSubmissionSchema.parse(candidate);
    return this.repository.submit({
      invitationId: input.invitationId,
      clientSubmissionId: input.clientSubmissionId,
      guestName: input.guestName,
      message: input.message,
      sourceHash,
    });
  }

  async listPublic(candidate: unknown) {
    const input = PublicWishListSchema.parse(candidate);
    const rows = await this.repository.listPublic({ invitationId: input.invitationId, limit: PUBLIC_PAGE_SIZE + 1, cursor: input.cursor });
    const hasMore = rows.length > PUBLIC_PAGE_SIZE;
    const items = rows.slice(0, PUBLIC_PAGE_SIZE);
    const last = items.at(-1);
    return { items, nextCursor: hasMore && last ? { createdAt: last.createdAt, id: last.id } : null };
  }

  async getOwnerDashboard(actor: User, invitationId: string, status: WishStatus = "pending", offset = 0) {
    if (actor.status !== "active") throw new Error("Akun tidak aktif.");
    const input = OwnedWishListSchema.parse({ invitationId, status, offset });
    const [summary, wishes] = await Promise.all([
      this.repository.getOwnedSummary(actor.id, input.invitationId),
      this.repository.listOwned(actor.id, input.invitationId, input.status, OWNER_PAGE_SIZE, input.offset),
    ]);
    return { summary, wishes, status: input.status, offset: input.offset };
  }

  async moderate(actor: User, candidate: unknown) {
    if (actor.status !== "active") throw new Error("Akun tidak aktif.");
    const input = ModerateWishSchema.parse(candidate);
    return this.repository.moderate(actor.id, input);
  }
}
