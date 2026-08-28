import { describe, expect, it, vi } from "vitest";
import users from "../../../contracts/dummy-data/users.json";
import { UsersSchema } from "@/domain";
import { InvitationMediaService } from "@/application/media-service";
import type { CompletedImageObject, InvitationAudioMedia, InvitationImageMedia, InvitationMediaRepository } from "@/repositories/contracts";

vi.mock("server-only", () => ({}));

const owner = UsersSchema.parse(users).find((user) => user.role === "user" && user.status === "active")!;
const mediaId = "7ab6d9dc-73ef-4da8-8e70-713a0cc53b30";
const uploadId = "ad52429b-7dc7-4fae-b49a-89d93eaa9abd";
const invitationId = "3e531e88-863c-4344-baf4-c3d8349f13db";
const readyMedia: InvitationImageMedia = {
  kind: "image",
  id: mediaId,
  invitationId,
  purpose: "couple",
  altText: "Foto pasangan",
  originalFilename: "couple.jpg",
  mimeType: "image/jpeg",
  sizeBytes: 1024,
  width: 1800,
  height: 1200,
  status: "ready",
  createdAt: "2026-08-27T00:00:00.000Z",
  variants: [
    { key: "thumbnail", storagePath: "thumbnail.webp", width: 400, height: 267, sizeBytes: 100, status: "ready" },
    { key: "medium", storagePath: "medium.webp", width: 900, height: 600, sizeBytes: 200, status: "ready" },
    { key: "large", storagePath: "large.webp", width: 1600, height: 1067, sizeBytes: 300, status: "ready" },
  ],
};
const completed: CompletedImageObject[] = [
  { key: "original", sizeBytes: 1024, width: 1800, height: 1200 },
  { key: "thumbnail", sizeBytes: 100, width: 400, height: 267 },
  { key: "medium", sizeBytes: 200, width: 900, height: 600 },
  { key: "large", sizeBytes: 300, width: 1600, height: 1067 },
];
const readyAudio: InvitationAudioMedia = {
  kind: "audio",
  id: "45eb823f-8a42-4dcc-8950-ed47b8493b1d",
  invitationId,
  purpose: "invitation_music",
  originalFilename: "lagu.mp3",
  mimeType: "audio/mpeg",
  sizeBytes: 4096,
  durationMs: 90_000,
  status: "ready",
  createdAt: "2026-08-28T00:00:00.000Z",
};

function repository(owned: boolean) {
  return {
    invitationOwnedBy: vi.fn(async () => owned),
    prepareImageUpload: vi.fn(async () => ({ media: { ...readyMedia, status: "uploading" as const }, reused: false, slots: [] })),
    beginImageProcessing: vi.fn(async () => undefined),
    completeImageProcessing: vi.fn(async () => readyMedia),
    markImageFailed: vi.fn(async () => undefined),
    listOwnedImages: vi.fn(async () => [readyMedia]),
    listPublishedImages: vi.fn(async () => [readyMedia]),
    updateImageAlt: vi.fn(async () => readyMedia),
    requestImageDeletion: vi.fn(async () => undefined),
    prepareAudioUpload: vi.fn(async () => ({ media: { ...readyAudio, status: "uploading" as const }, reused: false, slot: null })),
    beginAudioProcessing: vi.fn(async () => undefined),
    completeAudioProcessing: vi.fn(async () => readyAudio),
    markAudioFailed: vi.fn(async () => undefined),
    listOwnedAudio: vi.fn(async () => []),
  } satisfies InvitationMediaRepository;
}

const descriptor = {
  purpose: "couple" as const,
  clientUploadId: uploadId,
  originalFilename: "  couple.jpg  ",
  mimeType: "image/jpeg",
  sizeBytes: 1024,
  width: 1800,
  height: 1200,
  sha256: "a".repeat(64),
  altText: "  Foto   pasangan  ",
};

describe("invitation image media application boundary", () => {
  it("rejects foreign invitations before preparing signed upload metadata", async () => {
    const adapter = repository(false);
    await expect(new InvitationMediaService(adapter).prepareImageUpload(owner, invitationId, descriptor)).rejects.toThrow("bukan milik");
    expect(adapter.prepareImageUpload).not.toHaveBeenCalled();
  });

  it("validates metadata without receiving a File and forwards normalized owner-scoped input", async () => {
    const adapter = repository(true);
    await new InvitationMediaService(adapter).prepareImageUpload(owner, invitationId, descriptor);
    expect(adapter.prepareImageUpload).toHaveBeenCalledWith({
      ownerId: owner.id,
      invitationId,
      descriptor: { ...descriptor, originalFilename: "couple.jpg", altText: "Foto pasangan" },
    });
  });

  it("rejects an unknown media purpose before repository prepare", async () => {
    const adapter = repository(true);
    await expect(new InvitationMediaService(adapter).prepareImageUpload(owner, invitationId, {
      ...descriptor,
      purpose: "audio" as never,
    })).rejects.toThrow("Tujuan media image tidak valid");
    expect(adapter.prepareImageUpload).not.toHaveBeenCalled();
  });

  it("enforces UPLOADING to PROCESSING to READY ordering", async () => {
    const adapter = repository(true);
    await expect(new InvitationMediaService(adapter).finalizeImageUpload(owner, invitationId, mediaId, completed)).resolves.toEqual(readyMedia);
    expect(adapter.beginImageProcessing).toHaveBeenCalledBefore(adapter.completeImageProcessing);
    expect(adapter.markImageFailed).not.toHaveBeenCalled();
  });

  it("records FAILED when object verification cannot complete", async () => {
    const adapter = repository(true);
    adapter.completeImageProcessing.mockRejectedValueOnce(new Error("variant mismatch"));
    await expect(new InvitationMediaService(adapter).finalizeImageUpload(owner, invitationId, mediaId, completed)).rejects.toThrow("variant mismatch");
    expect(adapter.markImageFailed).toHaveBeenCalledWith(owner.id, invitationId, mediaId, "variant mismatch");
  });

  it("schedules deletion against the saved invitation version instead of deleting storage", async () => {
    const adapter = repository(true);
    const expectedVersion = "2026-08-27T01:00:00.000Z";
    await new InvitationMediaService(adapter).requestImageDeletion(owner, invitationId, mediaId, expectedVersion);
    expect(adapter.requestImageDeletion).toHaveBeenCalledWith(owner.id, invitationId, mediaId, expectedVersion);
  });
});

describe("invitation audio media application boundary", () => {
  const audioDescriptor = {
    purpose: "invitation_music" as const,
    clientUploadId: "d9e829ef-e6ba-45ee-84b4-daf8a5e99791",
    originalFilename: "  lagu.mp3  ",
    mimeType: "audio/mpeg" as const,
    sizeBytes: 4096,
    durationMs: 90_000,
    sha256: "b".repeat(64),
    contentSignature: "id3" as const,
  };

  it("authorizes ownership and forwards only normalized audio metadata", async () => {
    const adapter = repository(true);
    adapter.prepareAudioUpload.mockResolvedValueOnce({ media: { ...readyAudio, status: "uploading" }, reused: false, slot: null });
    await new InvitationMediaService(adapter).prepareAudioUpload(owner, invitationId, audioDescriptor);
    expect(adapter.prepareAudioUpload).toHaveBeenCalledWith({ ownerId: owner.id, invitationId, descriptor: { ...audioDescriptor, originalFilename: "lagu.mp3" } });
  });

  it("rejects mismatched MIME and magic signature before repository prepare", async () => {
    const adapter = repository(true);
    await expect(new InvitationMediaService(adapter).prepareAudioUpload(owner, invitationId, { ...audioDescriptor, contentSignature: "mp4-ftyp" })).rejects.toThrow("Signature");
    expect(adapter.prepareAudioUpload).not.toHaveBeenCalled();
  });

  it("uses the shared lifecycle ordering for audio finalization", async () => {
    const adapter = repository(true);
    adapter.completeAudioProcessing.mockResolvedValueOnce(readyAudio);
    await expect(new InvitationMediaService(adapter).finalizeAudioUpload(owner, invitationId, readyAudio.id)).resolves.toEqual(readyAudio);
    expect(adapter.beginAudioProcessing).toHaveBeenCalledBefore(adapter.completeAudioProcessing);
    expect(adapter.markAudioFailed).not.toHaveBeenCalled();
  });
});
