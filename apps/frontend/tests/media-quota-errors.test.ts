import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseInvitationMediaRepository } from "@/repositories/supabase/media-repository";

vi.mock("server-only", () => ({}));

const ownerId = "11111111-1111-4111-8111-111111111111";
const invitationId = "22222222-2222-4222-8222-222222222222";
const descriptor = {
  purpose: "gallery" as const,
  clientUploadId: "33333333-3333-4333-8333-333333333333",
  originalFilename: "gallery.png",
  mimeType: "image/png",
  sizeBytes: 1024,
  width: 1200,
  height: 800,
  sha256: "a".repeat(64),
  altText: "Gallery image",
};

describe("media quota domain errors", () => {
  it.each([
    ["media_user_quota_exceeded", "MEDIA_USER_QUOTA_EXCEEDED", "akun"],
    ["media_invitation_quota_exceeded", "MEDIA_INVITATION_QUOTA_EXCEEDED", "undangan"],
    ["media_gallery_quota_exceeded", "MEDIA_GALLERY_QUOTA_EXCEEDED", "galeri"],
  ])("maps %s to a stable UI-safe error", async (databaseMessage, code, uiMessage) => {
    const client = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: ownerId } }, error: null }) },
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: databaseMessage } }),
    } as unknown as SupabaseClient;
    const repository = new SupabaseInvitationMediaRepository(client);
    await expect(repository.prepareImageUpload({ ownerId, invitationId, descriptor })).rejects.toMatchObject({
      name: "MediaQuotaError",
      code,
      message: expect.stringContaining(uiMessage),
    });
  });
});
