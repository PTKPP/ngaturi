// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const currentProfile = vi.fn();
const createSignedUrl = vi.fn();
const maybeSingle = vi.fn();
const builder = { select: vi.fn(), eq: vi.fn(), maybeSingle };
builder.select.mockReturnValue(builder);
builder.eq.mockReturnValue(builder);
vi.mock("@/application/auth", () => ({ currentProfile }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabaseClient: () => ({
    from: () => builder,
    storage: { from: () => ({ createSignedUrl }) },
  }),
}));

describe("controlled private audio delivery", () => {
  beforeEach(() => {
    currentProfile.mockReset();
    createSignedUrl.mockReset();
    maybeSingle.mockReset();
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "http://127.0.0.1/storage/audio-token" }, error: null });
  });

  it("allows owner preview for READY draft audio", async () => {
    const mediaId = "7ab6d9dc-73ef-4da8-8e70-713a0cc53b30";
    maybeSingle.mockResolvedValue({ data: { storage_path: "owner/inv/media/original/audio.mp3", owner_id: "owner-1", invitations: { status: "draft", content: {} } }, error: null });
    currentProfile.mockResolvedValue({ id: "owner-1" });
    const { GET } = await import("@/app/api/public-audio/[id]/route");
    const response = await GET(new Request(`http://localhost/api/public-audio/${mediaId}`), { params: Promise.resolve({ id: mediaId }) });
    expect(response.status).toBe(307);
    expect(createSignedUrl).toHaveBeenCalledWith("owner/inv/media/original/audio.mp3", 1800);
  });

  it("hides draft audio from another user", async () => {
    const mediaId = "7ab6d9dc-73ef-4da8-8e70-713a0cc53b30";
    maybeSingle.mockResolvedValue({ data: { storage_path: "owner/inv/media/original/audio.mp3", owner_id: "owner-1", invitations: { status: "draft", content: {} } }, error: null });
    currentProfile.mockResolvedValue({ id: "attacker" });
    const { GET } = await import("@/app/api/public-audio/[id]/route");
    const response = await GET(new Request(`http://localhost/api/public-audio/${mediaId}`), { params: Promise.resolve({ id: mediaId }) });
    expect(response.status).toBe(404);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });
});
