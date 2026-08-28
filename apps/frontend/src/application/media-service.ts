import "server-only";

import type { User } from "@/domain";
import {
  IMAGE_VARIANT_KEYS,
  type CompletedImageObject,
  type ImageUploadDescriptor,
  type InvitationMediaRepository,
} from "@/repositories/contracts";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 12_000;
const MAX_IMAGE_PIXELS = 40_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;

export class InvitationMediaService {
  constructor(private readonly repository: InvitationMediaRepository) {}

  async prepareImageUpload(actor: User, invitationId: string, candidate: ImageUploadDescriptor) {
    this.assertActor(actor);
    await this.assertInvitationOwner(actor.id, invitationId);
    const descriptor = this.validateDescriptor(candidate);
    return this.repository.prepareImageUpload({ ownerId: actor.id, invitationId, descriptor });
  }

  async finalizeImageUpload(actor: User, invitationId: string, mediaId: string, objects: CompletedImageObject[]) {
    this.assertActor(actor);
    await this.assertInvitationOwner(actor.id, invitationId);
    this.assertMediaId(mediaId);
    const normalized = this.validateCompletedObjects(objects);
    await this.repository.beginImageProcessing(actor.id, invitationId, mediaId);
    try {
      return await this.repository.completeImageProcessing(actor.id, invitationId, mediaId, normalized);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Finalisasi image gagal.";
      await this.repository.markImageFailed(actor.id, invitationId, mediaId, reason.slice(0, 500)).catch(() => undefined);
      throw error;
    }
  }

  async failImageUpload(actor: User, invitationId: string, mediaId: string, reason: string) {
    this.assertActor(actor);
    await this.assertInvitationOwner(actor.id, invitationId);
    this.assertMediaId(mediaId);
    await this.repository.markImageFailed(actor.id, invitationId, mediaId, reason.trim().slice(0, 500) || "Upload image dibatalkan.");
  }

  async listOwnedImages(actor: User, invitationId: string) {
    this.assertActor(actor);
    await this.assertInvitationOwner(actor.id, invitationId);
    return this.repository.listOwnedImages(actor.id, invitationId);
  }

  async updateImageAlt(actor: User, invitationId: string, mediaId: string, altText: string) {
    this.assertActor(actor);
    await this.assertInvitationOwner(actor.id, invitationId);
    this.assertMediaId(mediaId);
    return this.repository.updateImageAlt(actor.id, invitationId, mediaId, this.normalizeAlt(altText));
  }

  async requestImageDeletion(actor: User, invitationId: string, mediaId: string, expectedInvitationUpdatedAt: string) {
    this.assertActor(actor);
    await this.assertInvitationOwner(actor.id, invitationId);
    this.assertMediaId(mediaId);
    if (!expectedInvitationUpdatedAt || Number.isNaN(Date.parse(expectedInvitationUpdatedAt))) throw new Error("Versi undangan untuk delete media tidak valid.");
    await this.repository.requestImageDeletion(actor.id, invitationId, mediaId, expectedInvitationUpdatedAt);
  }

  private validateDescriptor(candidate: ImageUploadDescriptor): ImageUploadDescriptor {
    const originalFilename = candidate.originalFilename.trim().slice(0, 180);
    if (!originalFilename) throw new Error("Nama file image wajib tersedia.");
    if (!ALLOWED_IMAGE_TYPES.has(candidate.mimeType) || !Number.isSafeInteger(candidate.sizeBytes) || candidate.sizeBytes <= 0 || candidate.sizeBytes > MAX_IMAGE_BYTES) {
      throw new Error("File harus JPEG, PNG, WebP, atau AVIF dan maksimal 10 MB.");
    }
    if (!UUID.test(candidate.clientUploadId)) throw new Error("Upload ID tidak valid.");
    if (!SHA256.test(candidate.sha256)) throw new Error("Fingerprint image tidak valid.");
    if (!Number.isSafeInteger(candidate.width) || !Number.isSafeInteger(candidate.height) || candidate.width <= 0 || candidate.height <= 0 || candidate.width > MAX_IMAGE_DIMENSION || candidate.height > MAX_IMAGE_DIMENSION || candidate.width * candidate.height > MAX_IMAGE_PIXELS) {
      throw new Error("Dimensi image tidak valid atau terlalu besar.");
    }
    return { ...candidate, originalFilename, altText: this.normalizeAlt(candidate.altText), sha256: candidate.sha256.toLowerCase() };
  }

  private validateCompletedObjects(objects: CompletedImageObject[]) {
    const expected = new Set<string>(["original", ...IMAGE_VARIANT_KEYS]);
    if (objects.length !== expected.size) throw new Error("Original dan seluruh variant image wajib diunggah.");
    const normalized = objects.map((object) => {
      if (!expected.delete(object.key)) throw new Error("Variant image duplikat atau tidak dikenal.");
      if (!Number.isSafeInteger(object.sizeBytes) || object.sizeBytes <= 0 || object.sizeBytes > MAX_IMAGE_BYTES) throw new Error("Ukuran object image tidak valid.");
      if (!Number.isSafeInteger(object.width) || !Number.isSafeInteger(object.height) || object.width <= 0 || object.height <= 0) throw new Error("Dimensi object image tidak valid.");
      return object;
    });
    if (expected.size) throw new Error("Variant image belum lengkap.");
    return normalized;
  }

  private normalizeAlt(value: string) {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized || normalized.length > 240) throw new Error("Alt text wajib diisi dan maksimal 240 karakter.");
    return normalized;
  }

  private assertMediaId(mediaId: string) {
    if (!UUID.test(mediaId)) throw new Error("Media ID tidak valid.");
  }

  private async assertInvitationOwner(ownerId: string, invitationId: string) {
    if (!await this.repository.invitationOwnedBy(ownerId, invitationId)) throw new Error("Undangan tidak ditemukan atau bukan milik Anda.");
  }

  private assertActor(actor: User) {
    if (actor.status !== "active") throw new Error("Akun tidak aktif.");
  }
}
