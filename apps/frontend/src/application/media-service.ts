import "server-only";

import type { User } from "@/domain";
import type { InvitationMediaRepository } from "@/repositories/contracts";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export class InvitationMediaService {
  constructor(private readonly repository: InvitationMediaRepository) {}

  async uploadImage(actor: User, invitationId: string, file: File, altText: string) {
    this.assertActor(actor);
    if (!await this.repository.invitationOwnedBy(actor.id, invitationId)) throw new Error("Undangan tidak ditemukan atau bukan milik Anda.");
    if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new Error("File harus JPEG, PNG, WebP, atau AVIF dan maksimal 10 MB.");
    const normalizedAlt = altText.trim();
    if (!normalizedAlt || normalizedAlt.length > 240) throw new Error("Alt text wajib diisi dan maksimal 240 karakter.");
    return this.repository.uploadImage({ ownerId: actor.id, invitationId, file, altText: normalizedAlt });
  }

  async removeImage(actor: User, invitationId: string, mediaId: string) {
    this.assertActor(actor);
    if (!await this.repository.invitationOwnedBy(actor.id, invitationId)) throw new Error("Undangan tidak ditemukan atau bukan milik Anda.");
    await this.repository.removeImage(actor.id, invitationId, mediaId);
  }

  private assertActor(actor: User) {
    if (actor.status !== "active") throw new Error("Akun tidak aktif.");
  }
}
