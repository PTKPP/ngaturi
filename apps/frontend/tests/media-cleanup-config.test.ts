import { describe, expect, it } from "vitest";
import { parseMediaCleanupConfig } from "@/application/media-cleanup-config";

const base = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "local-test-service-role",
  MEDIA_CLEANUP_WORKER_ID: "11111111-1111-4111-8111-111111111111",
};

describe("media cleanup scheduler configuration", () => {
  it("uses bounded production defaults", () => {
    const config = parseMediaCleanupConfig(base, true);
    expect(config).toMatchObject({ scheduled: true, intervalMs: 300_000, runLockLease: "30 minutes" });
    expect(config.runOptions).toMatchObject({ batchSize: 25, concurrency: 4, maxBatches: 20, maxAttempts: 8, leaseTimeout: "10 minutes" });
  });

  it.each([
    [{ MEDIA_CLEANUP_INTERVAL_MS: "9999" }, "MEDIA_CLEANUP_INTERVAL_MS"],
    [{ MEDIA_CLEANUP_CONCURRENCY: "17" }, "MEDIA_CLEANUP_CONCURRENCY"],
    [{ MEDIA_CLEANUP_RUN_LOCK_LEASE: "5 minutes" }, "tidak boleh lebih pendek"],
    [{ MEDIA_READY_ORPHAN_GRACE: "soon" }, "MEDIA_READY_ORPHAN_GRACE"],
  ])("rejects unsafe scheduler configuration %#", (override, message) => {
    expect(() => parseMediaCleanupConfig({ ...base, ...override }, true)).toThrow(message);
  });

  it("requires an explicit opt-in for non-local Supabase", () => {
    expect(() => parseMediaCleanupConfig({ ...base, NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" }, false))
      .toThrow("menolak Supabase non-lokal");
  });
});
