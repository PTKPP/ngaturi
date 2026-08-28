export const IMAGE_VARIANT_KEYS = ["thumbnail", "medium", "large"] as const;

export type ImageVariantKey = (typeof IMAGE_VARIANT_KEYS)[number];
export type ImageMediaPurpose = "couple" | "gallery";
export type AudioMediaPurpose = "invitation_music";
export type AudioContentSignature = "id3" | "mpeg-frame" | "mp4-ftyp";
export type InvitationMediaStatus = "uploading" | "processing" | "ready" | "failed" | "delete_pending";

export type MediaQuotaErrorCode =
  | "MEDIA_USER_QUOTA_EXCEEDED"
  | "MEDIA_INVITATION_QUOTA_EXCEEDED"
  | "MEDIA_GALLERY_QUOTA_EXCEEDED";

export class MediaQuotaError extends Error {
  constructor(public readonly code: MediaQuotaErrorCode, message: string) {
    super(message);
    this.name = "MediaQuotaError";
  }
}

export interface ImageVariantMetadata {
  key: ImageVariantKey;
  storagePath: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  status: InvitationMediaStatus;
}

export interface InvitationImageMedia {
  kind: "image";
  id: string;
  invitationId: string;
  purpose: ImageMediaPurpose | "legacy";
  altText: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  status: InvitationMediaStatus;
  createdAt: string;
  variants: ImageVariantMetadata[];
}

export interface InvitationAudioMedia {
  kind: "audio";
  id: string;
  invitationId: string;
  purpose: AudioMediaPurpose;
  originalFilename: string;
  mimeType: "audio/mpeg" | "audio/mp4";
  sizeBytes: number;
  durationMs: number;
  status: InvitationMediaStatus;
  createdAt: string;
}

export type InvitationOwnedMedia = InvitationImageMedia | InvitationAudioMedia;

export interface PublishedInvitationImage {
  id: string;
  altText: string;
}

export interface ImageUploadDescriptor {
  purpose: ImageMediaPurpose;
  clientUploadId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  sha256: string;
  altText: string;
}

export interface SignedImageUploadSlot {
  key: "original" | ImageVariantKey;
  path: string;
  token: string;
  contentType: string;
  targetWidth: number;
  targetHeight: number;
}

export interface PreparedImageUpload {
  media: InvitationImageMedia;
  reused: boolean;
  slots: SignedImageUploadSlot[];
}

export interface CompletedImageObject {
  key: "original" | ImageVariantKey;
  sizeBytes: number;
  width: number;
  height: number;
}

export interface AudioUploadDescriptor {
  purpose: AudioMediaPurpose;
  clientUploadId: string;
  originalFilename: string;
  mimeType: "audio/mpeg" | "audio/mp4";
  sizeBytes: number;
  durationMs: number;
  sha256: string;
  contentSignature: AudioContentSignature;
}

export interface SignedAudioUploadSlot {
  path: string;
  token: string;
  contentType: "audio/mpeg" | "audio/mp4";
}

export interface PreparedAudioUpload {
  media: InvitationAudioMedia;
  reused: boolean;
  slot: SignedAudioUploadSlot | null;
}

export interface InvitationMediaRepository {
  invitationOwnedBy(ownerId: string, invitationId: string): Promise<boolean>;
  prepareImageUpload(input: { ownerId: string; invitationId: string; descriptor: ImageUploadDescriptor }): Promise<PreparedImageUpload>;
  beginImageProcessing(ownerId: string, invitationId: string, mediaId: string): Promise<void>;
  completeImageProcessing(ownerId: string, invitationId: string, mediaId: string, objects: CompletedImageObject[]): Promise<InvitationImageMedia>;
  markImageFailed(ownerId: string, invitationId: string, mediaId: string, reason: string): Promise<void>;
  listOwnedImages(ownerId: string, invitationId: string): Promise<InvitationImageMedia[]>;
  listPublishedImages(invitationId: string): Promise<PublishedInvitationImage[]>;
  updateImageAlt(ownerId: string, invitationId: string, mediaId: string, altText: string): Promise<InvitationImageMedia>;
  requestImageDeletion(ownerId: string, invitationId: string, mediaId: string, expectedInvitationUpdatedAt: string): Promise<void>;
  prepareAudioUpload(input: { ownerId: string; invitationId: string; descriptor: AudioUploadDescriptor }): Promise<PreparedAudioUpload>;
  beginAudioProcessing(ownerId: string, invitationId: string, mediaId: string): Promise<void>;
  completeAudioProcessing(ownerId: string, invitationId: string, mediaId: string): Promise<InvitationAudioMedia>;
  markAudioFailed(ownerId: string, invitationId: string, mediaId: string, reason: string): Promise<void>;
  listOwnedAudio(ownerId: string, invitationId: string): Promise<InvitationAudioMedia[]>;
}
