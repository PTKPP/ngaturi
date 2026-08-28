export type MediaLifecycleReconcileOptions = {
  batchSize: number;
  uploadTimeout: string;
  processingTimeout: string;
  failedRetention: string;
  readyOrphanGrace: string;
  referenceRecheckInterval: string;
};

export type MediaLifecycleReconcileResult = {
  scanned: number;
  timedOut: number;
  failedQueued: number;
  temporaryOrphans: number;
  confirmedOrphans: number;
  referencesRestored: number;
};

export type ClaimedMediaCleanup = {
  mediaId: string;
  invitationId: string;
  originalPath: string;
  variantPaths: string[];
  claimToken: string;
  attemptCount: number;
};

export type ClaimMediaCleanupOptions = {
  workerId: string;
  batchSize: number;
  leaseTimeout: string;
  maxAttempts: number;
};

export interface InvitationMediaCleanupRepository {
  acquireRunLock(workerId: string, leaseTimeout: string): Promise<string | null>;
  releaseRunLock(lockToken: string): Promise<boolean>;
  reconcile(options: MediaLifecycleReconcileOptions): Promise<MediaLifecycleReconcileResult>;
  claim(options: ClaimMediaCleanupOptions): Promise<ClaimedMediaCleanup[]>;
  deleteVariants(paths: string[]): Promise<void>;
  deleteOriginal(path: string): Promise<void>;
  complete(mediaId: string, claimToken: string): Promise<"deleted" | "reference_blocked">;
  fail(mediaId: string, claimToken: string, reason: string, maxAttempts: number): Promise<boolean>;
  metrics(maxAttempts: number): Promise<Record<string, unknown>>;
}
