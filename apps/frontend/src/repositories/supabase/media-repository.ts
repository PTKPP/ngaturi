import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InvitationMediaRepository, StoredInvitationMedia } from "@/repositories/contracts";

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message ?? fallback);
}

export class SupabaseInvitationMediaRepository implements InvitationMediaRepository {
  constructor(private readonly client: SupabaseClient) {}

  async invitationOwnedBy(ownerId: string, invitationId: string): Promise<boolean> {
    const { data, error } = await this.client.from("invitations").select("id").eq("id", invitationId).eq("owner_id", ownerId).maybeSingle();
    if (error) fail(error, "Ownership undangan gagal diverifikasi.");
    return Boolean(data);
  }

  async uploadImage({ ownerId, invitationId, file, altText }: { ownerId: string; invitationId: string; file: File; altText: string }): Promise<StoredInvitationMedia> {
    const extension = file.type.split("/")[1].replace("jpeg", "jpg");
    const storagePath = `${ownerId}/${invitationId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await this.client.storage.from("invitation-media").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) fail(uploadError, "Upload media gagal.");
    const { data, error } = await this.client.from("invitation_media").insert({ invitation_id: invitationId, owner_id: ownerId, storage_path: storagePath, mime_type: file.type, size_bytes: file.size, alt_text: altText, status: "ready" }).select("id,storage_path").single();
    if (error) {
      await this.client.storage.from("invitation-media").remove([storagePath]);
      fail(error, "Metadata media gagal disimpan.");
    }
    return { id: String(data.id), storagePath: String(data.storage_path) };
  }

  async removeImage(ownerId: string, invitationId: string, mediaId: string): Promise<void> {
    const { data, error } = await this.client.from("invitation_media").select("storage_path").eq("id", mediaId).eq("invitation_id", invitationId).eq("owner_id", ownerId).single();
    if (error || !data) fail(error, "Media tidak ditemukan.");
    const storageResult = await this.client.storage.from("invitation-media").remove([data.storage_path]);
    if (storageResult.error) fail(storageResult.error, "Objek media gagal dihapus.");
    const deleteResult = await this.client.from("invitation_media").delete().eq("id", mediaId).eq("invitation_id", invitationId).eq("owner_id", ownerId);
    if (deleteResult.error) throw new Error("Objek sudah terhapus tetapi metadata belum terhapus; cleanup database perlu diulang.");
  }
}
