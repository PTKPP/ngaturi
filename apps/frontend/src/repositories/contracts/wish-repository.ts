import type { PublicWishRecord, WishModerationStatus, WishStatus } from "@/wishes/schema";

export type { PublicWishRecord } from "@/wishes/schema";

export type WishErrorCode =
  | "WISH_NOT_AVAILABLE"
  | "WISH_RATE_LIMITED"
  | "WISH_IDEMPOTENCY_CONFLICT"
  | "WISH_OWNER_ACCESS_DENIED"
  | "WISH_MODERATION_CONFLICT";

export class WishDomainError extends Error {
  constructor(public readonly code: WishErrorCode, message: string) {
    super(message);
    this.name = "WishDomainError";
  }
}

export interface OwnedWishRecord extends PublicWishRecord {
  status: WishStatus;
  updatedAt: string;
}

export interface WishSummary {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export interface SubmittedWish {
  id: string;
  submittedAt: string;
  idempotent: boolean;
}

export interface ModeratedWish {
  id: string;
  status: WishModerationStatus;
  updatedAt: string;
}

export interface InvitationWishRepository {
  submit(input: {
    invitationId: string;
    clientSubmissionId: string;
    guestName: string;
    message: string;
    sourceHash: string;
  }): Promise<SubmittedWish>;
  listPublic(input: {
    invitationId: string;
    limit: number;
    cursor: { createdAt: string; id: string } | null;
  }): Promise<PublicWishRecord[]>;
  getOwnedSummary(ownerId: string, invitationId: string): Promise<WishSummary>;
  listOwned(ownerId: string, invitationId: string, status: WishStatus, limit: number, offset: number): Promise<OwnedWishRecord[]>;
  moderate(ownerId: string, input: {
    invitationId: string;
    wishId: string;
    status: WishModerationStatus;
    expectedUpdatedAt: string;
  }): Promise<ModeratedWish>;
}
