import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  IMAGE_VARIANT_KEYS,
  type CompletedImageObject,
  type ImageUploadDescriptor,
  type ImageVariantKey,
  type InvitationImageMedia,
  type InvitationMediaRepository,
  type InvitationMediaStatus,
  MediaQuotaError,
  type PreparedImageUpload,
  type SignedImageUploadSlot,
} from "@/repositories/contracts";

const mediaColumns = "id,invitation_id,media_purpose,alt_text,original_filename,mime_type,size_bytes,width_px,height_px,status,created_at,variants:invitation_media_variants(variant_key,storage_path,width_px,height_px,size_bytes,status,target_width_px,target_height_px)";
const targetWidths: Record<ImageVariantKey, number> = { thumbnail: 400, medium: 900, large: 1600 };

function fail(error: { message: string } | null, fallback: string): never {
  const quotaErrors = {
    media_user_quota_exceeded: ["MEDIA_USER_QUOTA_EXCEEDED", "Kuota media akun sudah penuh. Hapus media yang tidak digunakan lalu tunggu cleanup selesai."],
    media_invitation_quota_exceeded: ["MEDIA_INVITATION_QUOTA_EXCEEDED", "Kuota media undangan ini sudah penuh. Hapus media yang tidak digunakan lalu tunggu cleanup selesai."],
    media_gallery_quota_exceeded: ["MEDIA_GALLERY_QUOTA_EXCEEDED", "Jumlah maksimum image galeri untuk undangan ini sudah tercapai."],
  } as const;
  const quota = Object.entries(quotaErrors).find(([key]) => error?.message.includes(key));
  if (quota) throw new MediaQuotaError(quota[1][0], quota[1][1]);
  throw new Error(error?.message ?? fallback);
}

function dimensions(width: number, height: number, targetWidth: number) {
  const nextWidth = Math.min(width, targetWidth);
  return { width: nextWidth, height: Math.max(1, Math.round(height * nextWidth / width)) };
}

function mapMedia(row: Record<string, unknown>): InvitationImageMedia {
  const variants = Array.isArray(row.variants) ? row.variants as Record<string, unknown>[] : [];
  return {
    id: String(row.id),
    invitationId: String(row.invitation_id),
    purpose: String(row.media_purpose ?? "legacy") as InvitationImageMedia["purpose"],
    altText: String(row.alt_text),
    originalFilename: String(row.original_filename),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    width: Number(row.width_px),
    height: Number(row.height_px),
    status: String(row.status) as InvitationMediaStatus,
    createdAt: String(row.created_at),
    variants: variants.map((variant) => ({
      key: String(variant.variant_key ?? variant.key) as ImageVariantKey,
      storagePath: String(variant.storage_path ?? variant.storagePath),
      width: variant.width_px == null && variant.width == null ? null : Number(variant.width_px ?? variant.width),
      height: variant.height_px == null && variant.height == null ? null : Number(variant.height_px ?? variant.height),
      sizeBytes: variant.size_bytes == null && variant.sizeBytes == null ? null : Number(variant.size_bytes ?? variant.sizeBytes),
      status: String(variant.status) as InvitationMediaStatus,
    })),
  };
}

function extensionFor(mimeType: string) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" } as Record<string, string>)[mimeType];
}

export class SupabaseInvitationMediaRepository implements InvitationMediaRepository {
  constructor(private readonly client: SupabaseClient) {}

  async invitationOwnedBy(ownerId: string, invitationId: string): Promise<boolean> {
    const { data, error } = await this.client.from("invitations").select("id").eq("id", invitationId).eq("owner_id", ownerId).maybeSingle();
    if (error) fail(error, "Ownership undangan gagal diverifikasi.");
    return Boolean(data);
  }

  async prepareImageUpload({ ownerId, invitationId, descriptor }: { ownerId: string; invitationId: string; descriptor: ImageUploadDescriptor }): Promise<PreparedImageUpload> {
    const mediaId = crypto.randomUUID();
    const authenticatedId = await this.currentUserId();
    if (authenticatedId !== ownerId) throw new Error("Actor upload tidak cocok dengan sesi Supabase.");
    const root = ownerId + "/" + invitationId + "/" + mediaId;
    const originalPath = root + "/original/" + crypto.randomUUID() + "." + extensionFor(descriptor.mimeType);
    const variants = IMAGE_VARIANT_KEYS.map((key) => {
      const target = dimensions(descriptor.width, descriptor.height, targetWidths[key]);
      return { key, path: root + "/variants/" + key + "-" + crypto.randomUUID() + ".webp", targetWidth: target.width, targetHeight: target.height };
    });
    const { data, error } = await this.client.rpc("prepare_image_media_upload", {
      p_media_id: mediaId,
      p_invitation_id: invitationId,
      p_client_upload_id: descriptor.clientUploadId,
      p_original_filename: descriptor.originalFilename,
      p_mime_type: descriptor.mimeType,
      p_size_bytes: descriptor.sizeBytes,
      p_width_px: descriptor.width,
      p_height_px: descriptor.height,
      p_sha256: descriptor.sha256,
      p_alt_text: descriptor.altText,
      p_original_path: originalPath,
      p_variants: variants,
      p_media_purpose: descriptor.purpose,
    });
    if (error) fail(error, "Metadata upload image gagal disiapkan.");
    const prepared = Array.isArray(data) ? data[0] : data;
    const preparedId = String((prepared as Record<string, unknown>)?.media_id ?? "");
    const reused = Boolean((prepared as Record<string, unknown>)?.reused);
    const media = await this.getOwnedImage(invitationId, preparedId);
    if (!media) throw new Error("Metadata upload image tidak ditemukan setelah prepare.");
    if (reused) return { media, reused: true, slots: [] };

    const slotDefinitions = [
      { key: "original" as const, path: originalPath, contentType: descriptor.mimeType, targetWidth: descriptor.width, targetHeight: descriptor.height },
      ...variants.map((variant) => ({ key: variant.key, path: variant.path, contentType: "image/webp", targetWidth: variant.targetWidth, targetHeight: variant.targetHeight })),
    ];
    try {
      const slots = await Promise.all(slotDefinitions.map(async (slot): Promise<SignedImageUploadSlot> => {
        const { data: signed, error: signedError } = await this.client.storage.from("invitation-media").createSignedUploadUrl(slot.path, { upsert: false });
        if (signedError || !signed?.token) fail(signedError, "Signed upload " + slot.key + " gagal dibuat.");
        return { ...slot, token: signed.token };
      }));
      return { media, reused: false, slots };
    } catch (error) {
      await this.markImageFailed("", invitationId, preparedId, "Signed upload token gagal dibuat.").catch(() => undefined);
      throw error;
    }
  }

  async beginImageProcessing(_ownerId: string, invitationId: string, mediaId: string) {
    const { error } = await this.client.rpc("begin_image_media_processing", { p_invitation_id: invitationId, p_media_id: mediaId });
    if (error) fail(error, "Image tidak dapat masuk tahap processing.");
  }

  async completeImageProcessing(_ownerId: string, invitationId: string, mediaId: string, objects: CompletedImageObject[]) {
    const { error } = await this.client.rpc("complete_image_media_processing", { p_invitation_id: invitationId, p_media_id: mediaId, p_objects: objects });
    if (error) fail(error, "Object image belum lengkap atau tidak sesuai metadata.");
    const media = await this.getOwnedImage(invitationId, mediaId);
    if (!media) throw new Error("Image READY tidak ditemukan setelah finalisasi.");
    return media;
  }

  async markImageFailed(_ownerId: string, invitationId: string, mediaId: string, reason: string) {
    const { error } = await this.client.rpc("fail_image_media_upload", { p_invitation_id: invitationId, p_media_id: mediaId, p_reason: reason });
    if (error) fail(error, "Status gagal image tidak dapat dicatat.");
  }

  async listOwnedImages(_ownerId: string, invitationId: string) {
    const { data, error } = await this.client.from("invitation_media").select(mediaColumns).eq("invitation_id", invitationId).in("status", ["uploading", "processing", "ready", "failed"]).order("created_at");
    if (error) fail(error, "Daftar media undangan gagal dimuat.");
    return (data ?? []).map((row) => mapMedia(row as Record<string, unknown>));
  }

  async listPublishedImages(invitationId: string) {
    const { data, error } = await this.client.rpc("get_published_invitation_media", { p_invitation_id: invitationId });
    if (error) fail(error, "Metadata media publik gagal dimuat.");
    return (data ?? []).map((row: Record<string, unknown>) => ({ id: String(row.id), altText: String(row.alt_text) }));
  }

  async updateImageAlt(_ownerId: string, invitationId: string, mediaId: string, altText: string) {
    const { error } = await this.client.rpc("update_image_media_alt", { p_invitation_id: invitationId, p_media_id: mediaId, p_alt_text: altText });
    if (error) fail(error, "Alt text image gagal disimpan.");
    const media = await this.getOwnedImage(invitationId, mediaId);
    if (!media) throw new Error("Media tidak ditemukan setelah alt text diperbarui.");
    return media;
  }

  async requestImageDeletion(_ownerId: string, invitationId: string, mediaId: string, expectedInvitationUpdatedAt: string) {
    const { error } = await this.client.rpc("request_image_media_deletion", {
      p_invitation_id: invitationId,
      p_media_id: mediaId,
      p_expected_invitation_updated_at: expectedInvitationUpdatedAt,
    });
    if (error) fail(error, "Media belum dapat dijadwalkan untuk dihapus.");
  }

  private async currentUserId() {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data.user) fail(error, "Autentikasi upload tidak tersedia.");
    return data.user.id;
  }

  private async getOwnedImage(invitationId: string, mediaId: string) {
    const { data, error } = await this.client.from("invitation_media").select(mediaColumns).eq("id", mediaId).eq("invitation_id", invitationId).maybeSingle();
    if (error) fail(error, "Metadata image gagal dimuat.");
    if (!data) return null;
    return mapMedia(data as Record<string, unknown>);
  }
}
