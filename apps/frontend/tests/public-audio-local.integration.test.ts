// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe.runIf(process.env.LOCAL_SUPABASE_INTEGRATION === "1")("public audio route with local Supabase", () => {
  it("returns a short-lived redirect only for READY referenced audio on a published invitation", async () => {
    const { GET } = await import("@/app/api/public-audio/[id]/route");
    const mediaId = process.env.LOCAL_READY_AUDIO_ID;
    expect(mediaId).toMatch(/^[0-9a-f-]{36}$/);
    const response = await GET(new Request(`http://localhost/api/public-audio/${mediaId}`), { params: Promise.resolve({ id: mediaId! }) });
    expect(response.status).toBe(307);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const location = response.headers.get("location");
    expect(location).toContain("/storage/v1/object/sign/invitation-media/");
    const downloaded = await fetch(location!);
    expect(downloaded.status).toBe(200);
    expect(downloaded.headers.get("content-type")).toBe("audio/mpeg");
    expect((await downloaded.arrayBuffer()).byteLength).toBeGreaterThan(0);

    const missing = await GET(new Request("http://localhost/api/public-audio/7ab6d9dc-73ef-4da8-8e70-713a0cc53b30"), { params: Promise.resolve({ id: "7ab6d9dc-73ef-4da8-8e70-713a0cc53b30" }) });
    expect(missing.status).toBe(404);
  });
});
