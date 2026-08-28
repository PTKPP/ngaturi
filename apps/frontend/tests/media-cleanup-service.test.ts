import { describe, expect, it, vi } from "vitest";
import type { InvitationMediaCleanupRepository } from "@/repositories/contracts";

vi.mock("server-only", () => ({}));

const reconciliation = {
  scanned: 2,
  timedOut: 1,
  failedQueued: 0,
  temporaryOrphans: 1,
  confirmedOrphans: 0,
  referencesRestored: 0,
};

function options() {
  return {
    workerId: "11111111-1111-4111-8111-111111111111",
    batchSize: 10,
    concurrency: 2,
    maxBatches: 2,
    maxAttempts: 3,
    leaseTimeout: "10 minutes",
    reconciliation: {
      batchSize: 100,
      uploadTimeout: "2 hours",
      processingTimeout: "1 hour",
      failedRetention: "24 hours",
      readyOrphanGrace: "7 days",
      referenceRecheckInterval: "1 hour",
    },
  };
}

describe("InvitationMediaCleanupService", () => {
  it("deletes variants before original and finalizes once", async () => {
    const calls: string[] = [];
    let claims = 0;
    const repository: InvitationMediaCleanupRepository = {
      acquireRunLock: vi.fn().mockResolvedValue("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      releaseRunLock: vi.fn().mockResolvedValue(true),
      reconcile: vi.fn().mockResolvedValue(reconciliation),
      claim: vi.fn().mockImplementation(async () => claims++ === 0 ? [{
        mediaId: "22222222-2222-4222-8222-222222222222",
        invitationId: "33333333-3333-4333-8333-333333333333",
        originalPath: "owner/invitation/media/original/file.png",
        variantPaths: ["thumbnail.webp", "medium.webp", "large.webp"],
        claimToken: "44444444-4444-4444-8444-444444444444",
        attemptCount: 1,
      }] : []),
      deleteVariants: vi.fn().mockImplementation(async () => { calls.push("variants"); }),
      deleteOriginal: vi.fn().mockImplementation(async () => { calls.push("original"); }),
      complete: vi.fn().mockImplementation(async () => { calls.push("complete"); return "deleted" as const; }),
      fail: vi.fn(),
      metrics: vi.fn().mockResolvedValue({ claimed: 0 }),
    };
    const { InvitationMediaCleanupService } = await import("@/application/media-cleanup-service");
    const result = await new InvitationMediaCleanupService(repository).runOnce(options());

    expect(calls).toEqual(["variants", "original", "complete"]);
    expect(result).toMatchObject({ claimed: 1, deleted: 1, failed: 0 });
    expect(repository.fail).not.toHaveBeenCalled();
  });

  it("records a bounded retry when Storage deletion fails", async () => {
    let claims = 0;
    const repository: InvitationMediaCleanupRepository = {
      acquireRunLock: vi.fn().mockResolvedValue("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      releaseRunLock: vi.fn().mockResolvedValue(true),
      reconcile: vi.fn().mockResolvedValue(reconciliation),
      claim: vi.fn().mockImplementation(async () => claims++ === 0 ? [{
        mediaId: "55555555-5555-4555-8555-555555555555",
        invitationId: "66666666-6666-4666-8666-666666666666",
        originalPath: "missing.png",
        variantPaths: ["variant.webp"],
        claimToken: "77777777-7777-4777-8777-777777777777",
        attemptCount: 3,
      }] : []),
      deleteVariants: vi.fn().mockRejectedValue(new Error("Storage unavailable")),
      deleteOriginal: vi.fn(),
      complete: vi.fn(),
      fail: vi.fn().mockResolvedValue(false),
      metrics: vi.fn().mockResolvedValue({ retryExhausted: 1 }),
    };
    const { InvitationMediaCleanupService } = await import("@/application/media-cleanup-service");
    const result = await new InvitationMediaCleanupService(repository).runOnce(options());

    expect(repository.fail).toHaveBeenCalledWith(
      "55555555-5555-4555-8555-555555555555",
      "77777777-7777-4777-8777-777777777777",
      "Storage unavailable",
      3,
    );
    expect(repository.deleteOriginal).not.toHaveBeenCalled();
    expect(repository.complete).not.toHaveBeenCalled();
    expect(result).toMatchObject({ failed: 1, retryScheduled: 0, retryExhausted: 1 });
  });

  it("skips an overlapping scheduled run before reconciliation", async () => {
    const repository: InvitationMediaCleanupRepository = {
      acquireRunLock: vi.fn().mockResolvedValue(null),
      releaseRunLock: vi.fn(),
      reconcile: vi.fn(),
      claim: vi.fn(),
      deleteVariants: vi.fn(),
      deleteOriginal: vi.fn(),
      complete: vi.fn(),
      fail: vi.fn(),
      metrics: vi.fn(),
    };
    const { InvitationMediaCleanupService } = await import("@/application/media-cleanup-service");
    await expect(new InvitationMediaCleanupService(repository).runExclusive(options(), "30 minutes"))
      .resolves.toEqual({ status: "skipped_overlap" });
    expect(repository.reconcile).not.toHaveBeenCalled();
    expect(repository.releaseRunLock).not.toHaveBeenCalled();
  });

  it("always releases the distributed run lock after a worker failure", async () => {
    const repository: InvitationMediaCleanupRepository = {
      acquireRunLock: vi.fn().mockResolvedValue("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      releaseRunLock: vi.fn().mockResolvedValue(true),
      reconcile: vi.fn().mockRejectedValue(new Error("database unavailable")),
      claim: vi.fn(),
      deleteVariants: vi.fn(),
      deleteOriginal: vi.fn(),
      complete: vi.fn(),
      fail: vi.fn(),
      metrics: vi.fn(),
    };
    const { InvitationMediaCleanupService } = await import("@/application/media-cleanup-service");
    await expect(new InvitationMediaCleanupService(repository).runExclusive(options(), "30 minutes"))
      .rejects.toThrow("database unavailable");
    expect(repository.releaseRunLock).toHaveBeenCalledWith("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
