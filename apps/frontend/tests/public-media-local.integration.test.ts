// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const runLocal = process.env.LOCAL_SUPABASE_INTEGRATION === "1";

describe.runIf(runLocal)("public media route with local Supabase", () => {
  it("delivers only a READY referenced variant to a guest", async () => {
    const { GET } = await import("@/app/api/public-media/[id]/route");
    const readyId = process.env.LOCAL_READY_MEDIA_ID;
    const deletePendingId = process.env.LOCAL_DELETE_PENDING_MEDIA_ID;
    expect(readyId).toMatch(/^[0-9a-f-]{36}$/);
    expect(deletePendingId).toMatch(/^[0-9a-f-]{36}$/);

    const published = await GET(
      new Request(`http://localhost/api/public-media/${readyId}?variant=large`),
      { params: Promise.resolve({ id: readyId! }) },
    );
    expect(published.status).toBe(200);
    expect(published.headers.get("content-type")).toBe("image/webp");
    expect(published.headers.get("cache-control")).toContain("public");
    expect((await published.arrayBuffer()).byteLength).toBeGreaterThan(0);

    const pendingDelete = await GET(
      new Request(`http://localhost/api/public-media/${deletePendingId}?variant=large`),
      { params: Promise.resolve({ id: deletePendingId! }) },
    );
    expect(pendingDelete.status).toBe(404);
  });
});
