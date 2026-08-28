import type { RsvpAttendanceStatus } from "@/rsvp/schema";

export type RsvpErrorCode =
  | "RSVP_NOT_AVAILABLE"
  | "RSVP_RATE_LIMITED"
  | "RSVP_IDEMPOTENCY_CONFLICT"
  | "RSVP_OWNER_ACCESS_DENIED";

export class RsvpDomainError extends Error {
  constructor(public readonly code: RsvpErrorCode, message: string) {
    super(message);
    this.name = "RsvpDomainError";
  }
}

export interface GuestRsvpRecord {
  id: string;
  guestName: string;
  attendanceStatus: RsvpAttendanceStatus;
  guestCount: number;
  note: string | null;
  createdAt: string;
}

export interface RsvpSummary {
  attending: number;
  notAttending: number;
  attendingGuestCount: number;
  totalResponses: number;
}

export interface SubmittedRsvp {
  id: string;
  submittedAt: string;
  idempotent: boolean;
}

export interface InvitationRsvpRepository {
  submit(input: {
    invitationId: string;
    clientSubmissionId: string;
    guestName: string;
    attendanceStatus: RsvpAttendanceStatus;
    guestCount: number;
    note: string;
    sourceHash: string;
  }): Promise<SubmittedRsvp>;
  getOwnedSummary(ownerId: string, invitationId: string): Promise<RsvpSummary>;
  listOwned(ownerId: string, invitationId: string, limit: number, offset: number): Promise<GuestRsvpRecord[]>;
}
