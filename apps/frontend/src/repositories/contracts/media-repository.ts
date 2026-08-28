export const IMAGE_VARIANT_KEYS = ["thumbnail", "medium", "large"] as const;

export type ImageVariantKey = (typeof IMAGE_VARIANT_KEYS)[number];
export type InvitationMediaStatus = "uploading" | "processing" | "ready" | "failed" | "delete_pending";

export interface ImageVariantMetadata {
  key: ImageVariantKey;
  storagePath: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  status: InvitationMediaStatus;
}

export interface InvitationImageMedia {
  id: string;
  invitationId: string;
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

export interface PublishedInvitationImage {
  id: string;
  altText: string;
}

export interface ImageUploadDescriptor {
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
}
