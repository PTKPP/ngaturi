import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_BYTES = 10 * 1024 * 1024;

export class InvitationMediaService {
  constructor(private readonly client: SupabaseClient) {}

  async upload(ownerId: string, invitationId: string, file: File, altText: string) {
    if (!ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_BYTES) throw new Error("File harus JPEG, PNG, WebP, atau AVIF dan maksimal 10 MB.");
    const extension = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${ownerId}/${invitationId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await this.client.storage.from("invitation-media").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const { data, error } = await this.client.from("invitation_media").insert({ invitation_id: invitationId, owner_id: ownerId, storage_path: path, mime_type: file.type, size_bytes: file.size, alt_text: altText.trim(), status: "ready" }).select("id,storage_path").single();
    if (error) { await this.client.storage.from("invitation-media").remove([path]); throw new Error(error.message); }
    return data;
  }

  async remove(ownerId: string, mediaId: string) {
    const { data, error } = await this.client.from("invitation_media").select("storage_path").eq("id", mediaId).eq("owner_id", ownerId).single();
    if (error || !data) throw new Error(error?.message ?? "Media tidak ditemukan.");
    const storageResult = await this.client.storage.from("invitation-media").remove([data.storage_path]);
    if (storageResult.error) throw new Error(storageResult.error.message);
    const deleteResult = await this.client.from("invitation_media").delete().eq("id", mediaId).eq("owner_id", ownerId);
    if (deleteResult.error) throw new Error("Objek sudah terhapus tetapi metadata belum terhapus; cleanup database perlu diulang.");
  }
}
