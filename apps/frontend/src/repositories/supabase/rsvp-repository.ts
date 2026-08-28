import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RsvpDomainError,
  type GuestRsvpRecord,
  type InvitationRsvpRepository,
  type RsvpSummary,
  type SubmittedRsvp,
} from "@/repositories/contracts";

function fail(error: { message: string } | null, fallback: string): never {
  const message = error?.message ?? fallback;
  if (message.includes("rsvp_invitation_not_available")) throw new RsvpDomainError("RSVP_NOT_AVAILABLE", "RSVP tidak tersedia untuk undangan ini.");
  if (message.includes("rsvp_rate_limited")) throw new RsvpDomainError("RSVP_RATE_LIMITED", "Terlalu banyak percobaan. Silakan tunggu beberapa menit lalu coba lagi.");
  if (message.includes("rsvp_idempotency_conflict")) throw new RsvpDomainError("RSVP_IDEMPOTENCY_CONFLICT", "Data RSVP berubah saat dikirim ulang. Silakan muat ulang undangan.");
  if (message.includes("rsvp_owner_access_denied")) throw new RsvpDomainError("RSVP_OWNER_ACCESS_DENIED", "Anda tidak dapat melihat RSVP undangan ini.");
  throw new Error(message);
}

export class SupabaseInvitationRsvpRepository implements InvitationRsvpRepository {
  constructor(private readonly client: SupabaseClient) {}

  async submit(input: Parameters<InvitationRsvpRepository["submit"]>[0]): Promise<SubmittedRsvp> {
    const { data, error } = await this.client.rpc("submit_public_invitation_rsvp", {
      p_invitation_id: input.invitationId,
      p_client_submission_id: input.clientSubmissionId,
      p_guest_name: input.guestName,
      p_attendance_status: input.attendanceStatus,
      p_guest_count: input.guestCount,
      p_note: input.note,
      p_source_hash: input.sourceHash,
    });
    if (error) fail(error, "RSVP gagal disimpan.");
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Hasil submission RSVP tidak tersedia.");
    return { id: String(row.rsvp_id), submittedAt: String(row.submitted_at), idempotent: Boolean(row.idempotent) };
  }

  async getOwnedSummary(ownerId: string, invitationId: string): Promise<RsvpSummary> {
    const { data, error } = await this.client.rpc("get_owned_invitation_rsvp_summary", { p_owner_id: ownerId, p_invitation_id: invitationId });
    if (error) fail(error, "Summary RSVP gagal dimuat.");
    const row = Array.isArray(data) ? data[0] : data;
    return {
      attending: Number(row?.attending ?? 0),
      notAttending: Number(row?.not_attending ?? 0),
      attendingGuestCount: Number(row?.attending_guest_count ?? 0),
      totalResponses: Number(row?.total_responses ?? 0),
    };
  }

  async listOwned(ownerId: string, invitationId: string, limit: number, offset: number): Promise<GuestRsvpRecord[]> {
    const { data, error } = await this.client.rpc("list_owned_invitation_rsvps", { p_owner_id: ownerId, p_invitation_id: invitationId, p_limit: limit, p_offset: offset });
    if (error) fail(error, "Daftar RSVP gagal dimuat.");
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      guestName: String(row.guest_name),
      attendanceStatus: String(row.attendance_status) as GuestRsvpRecord["attendanceStatus"],
      guestCount: Number(row.guest_count),
      note: row.note == null ? null : String(row.note),
      createdAt: String(row.created_at),
    }));
  }
}
