import "server-only";

import type {
  InvitationMediaCleanupRepository,
  MediaLifecycleReconcileOptions,
} from "@/repositories/contracts";

export type MediaCleanupRunOptions = {
  workerId: string;
  batchSize: number;
  concurrency: number;
  maxBatches: number;
  maxAttempts: number;
  leaseTimeout: string;
  reconciliation: MediaLifecycleReconcileOptions;
};

export type MediaCleanupRunResult = {
  workerId: string;
  reconciliation: Awaited<ReturnType<InvitationMediaCleanupRepository["reconcile"]>>;
  claimed: number;
  deleted: number;
  referenceBlocked: number;
  failed: number;
  retryScheduled: number;
  retryExhausted: number;
  failureRecordingErrors: number;
  metrics: Record<string, unknown>;
};

export type ExclusiveMediaCleanupRunResult =
  | { status: "skipped_overlap" }
  | { status: "completed"; result: MediaCleanupRunResult };

export class InvitationMediaCleanupService {
  constructor(private readonly repository: InvitationMediaCleanupRepository) {}

  async runExclusive(options: MediaCleanupRunOptions, runLockLease: string): Promise<ExclusiveMediaCleanupRunResult> {
    const lockToken = await this.repository.acquireRunLock(options.workerId, runLockLease);
    if (!lockToken) return { status: "skipped_overlap" };
    let runError: unknown;
    try {
      return { status: "completed", result: await this.runOnce(options) };
    } catch (error) {
      runError = error;
      throw error;
    } finally {
      try {
        const released = await this.repository.releaseRunLock(lockToken);
        if (!released && !runError) throw new Error("Lock run cleanup media tidak lagi dimiliki worker.");
      } catch (releaseError) {
        if (!runError) throw releaseError;
      }
    }
  }

  async runOnce(options: MediaCleanupRunOptions): Promise<MediaCleanupRunResult> {
    this.validate(options);
    const result: MediaCleanupRunResult = {
      workerId: options.workerId,
      reconciliation: await this.repository.reconcile(options.reconciliation),
      claimed: 0,
      deleted: 0,
      referenceBlocked: 0,
      failed: 0,
      retryScheduled: 0,
      retryExhausted: 0,
      failureRecordingErrors: 0,
      metrics: {},
    };

    for (let batch = 0; batch < options.maxBatches; batch += 1) {
      const claims = await this.repository.claim({
        workerId: options.workerId,
        batchSize: options.batchSize,
        leaseTimeout: options.leaseTimeout,
        maxAttempts: options.maxAttempts,
      });
      if (claims.length === 0) break;
      result.claimed += claims.length;

      for (let offset = 0; offset < claims.length; offset += options.concurrency) {
        const group = claims.slice(offset, offset + options.concurrency);
        await Promise.all(group.map(async (claim) => {
          try {
            await this.repository.deleteVariants(claim.variantPaths);
            await this.repository.deleteOriginal(claim.originalPath);
            const outcome = await this.repository.complete(claim.mediaId, claim.claimToken);
            if (outcome === "deleted") result.deleted += 1;
            else result.referenceBlocked += 1;
          } catch (error) {
            result.failed += 1;
            const reason = error instanceof Error ? error.message : "Storage cleanup gagal.";
            try {
              const retry = await this.repository.fail(claim.mediaId, claim.claimToken, reason.slice(0, 1000), options.maxAttempts);
              if (retry) result.retryScheduled += 1;
              else result.retryExhausted += 1;
            } catch {
              result.failureRecordingErrors += 1;
            }
          }
        }));
      }
    }

    result.metrics = await this.repository.metrics(options.maxAttempts);
    return result;
  }

  private validate(options: MediaCleanupRunOptions) {
    if (!/^[0-9a-f-]{36}$/i.test(options.workerId)) throw new Error("Worker ID cleanup media tidak valid.");
    if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 100) throw new Error("Batch cleanup media harus 1-100.");
    if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 16) throw new Error("Concurrency cleanup media harus 1-16.");
    if (!Number.isInteger(options.maxBatches) || options.maxBatches < 1 || options.maxBatches > 100) throw new Error("Max batch cleanup media harus 1-100.");
    if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1 || options.maxAttempts > 20) throw new Error("Max attempt cleanup media harus 1-20.");
  }
}
