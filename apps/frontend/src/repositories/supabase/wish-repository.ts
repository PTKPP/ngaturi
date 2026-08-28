import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WishDomainError,
  type InvitationWishRepository,
  type ModeratedWish,
  type OwnedWishRecord,
  type PublicWishRecord,
  type SubmittedWish,
  type WishSummary,
} from "@/repositories/contracts";

function fail(error: { message: string } | null, fallback: string): never {
  const message = error?.message ?? fallback;
  if (message.includes("wish_invitation_not_available")) throw new WishDomainError("WISH_NOT_AVAILABLE", "Ucapan tidak tersedia untuk undangan ini.");
  if (message.includes("wish_rate_limited")) throw new WishDomainError("WISH_RATE_LIMITED", "Terlalu banyak ucapan dikirim. Silakan tunggu beberapa menit lalu coba lagi.");
  if (message.includes("wish_idempotency_conflict")) throw new WishDomainError("WISH_IDEMPOTENCY_CONFLICT", "Ucapan berubah saat dikirim ulang. Silakan muat ulang undangan.");
  if (message.includes("wish_owner_access_denied")) throw new WishDomainError("WISH_OWNER_ACCESS_DENIED", "Anda tidak dapat mengelola ucapan undangan ini.");
  if (message.includes("wish_moderation_conflict")) throw new WishDomainError("WISH_MODERATION_CONFLICT", "Status ucapan sudah berubah. Daftar akan dimuat ulang.");
  throw new Error(message);
}

const publicRecord = (row: Record<string, unknown>): PublicWishRecord => ({
  id: String(row.id),
  guestName: String(row.guest_name),
  message: String(row.message),
  createdAt: String(row.created_at),
});

export class SupabaseInvitationWishRepository implements InvitationWishRepository {
  constructor(private readonly client: SupabaseClient) {}

  async submit(input: Parameters<InvitationWishRepository["submit"]>[0]): Promise<SubmittedWish> {
    const { data, error } = await this.client.rpc("submit_public_invitation_wish", {
      p_invitation_id: input.invitationId,
      p_client_submission_id: input.clientSubmissionId,
      p_guest_name: input.guestName,
      p_message: input.message,
      p_source_hash: input.sourceHash,
    });
    if (error) fail(error, "Ucapan gagal disimpan.");
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Hasil submission ucapan tidak tersedia.");
    return { id: String(row.wish_id), submittedAt: String(row.submitted_at), idempotent: Boolean(row.idempotent) };
  }

  async listPublic(input: Parameters<InvitationWishRepository["listPublic"]>[0]): Promise<PublicWishRecord[]> {
    const { data, error } = await this.client.rpc("list_public_approved_invitation_wishes", {
      p_invitation_id: input.invitationId,
      p_limit: input.limit,
      p_before_created_at: input.cursor?.createdAt ?? null,
      p_before_id: input.cursor?.id ?? null,
    });
    if (error) fail(error, "Daftar ucapan gagal dimuat.");
    return (data ?? []).map((row: Record<string, unknown>) => publicRecord(row));
  }

  async getOwnedSummary(ownerId: string, invitationId: string): Promise<WishSummary> {
    const { data, error } = await this.client.rpc("get_owned_invitation_wish_summary", { p_owner_id: ownerId, p_invitation_id: invitationId });
    if (error) fail(error, "Summary ucapan gagal dimuat.");
    const row = Array.isArray(data) ? data[0] : data;
    return {
      pending: Number(row?.pending ?? 0),
      approved: Number(row?.approved ?? 0),
      rejected: Number(row?.rejected ?? 0),
      total: Number(row?.total ?? 0),
    };
  }

  async listOwned(ownerId: string, invitationId: string, status: Parameters<InvitationWishRepository["listOwned"]>[2], limit: number, offset: number): Promise<OwnedWishRecord[]> {
    const { data, error } = await this.client.rpc("list_owned_invitation_wishes", {
      p_owner_id: ownerId,
      p_invitation_id: invitationId,
      p_status: status,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) fail(error, "Daftar moderasi ucapan gagal dimuat.");
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...publicRecord(row),
      status: String(row.status) as OwnedWishRecord["status"],
      updatedAt: String(row.updated_at),
    }));
  }

  async moderate(ownerId: string, input: Parameters<InvitationWishRepository["moderate"]>[1]): Promise<ModeratedWish> {
    const { data, error } = await this.client.rpc("moderate_owned_invitation_wish", {
      p_owner_id: ownerId,
      p_invitation_id: input.invitationId,
      p_wish_id: input.wishId,
      p_status: input.status,
      p_expected_updated_at: input.expectedUpdatedAt,
    });
    if (error) fail(error, "Moderasi ucapan gagal disimpan.");
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Hasil moderasi ucapan tidak tersedia.");
    return { id: String(row.wish_id), status: String(row.moderated_status) as ModeratedWish["status"], updatedAt: String(row.moderated_at) };
  }
}
