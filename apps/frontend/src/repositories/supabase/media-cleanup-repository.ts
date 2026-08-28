import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ClaimMediaCleanupOptions,
  ClaimedMediaCleanup,
  InvitationMediaCleanupRepository,
  MediaLifecycleReconcileOptions,
  MediaLifecycleReconcileResult,
} from "@/repositories/contracts";

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message ?? fallback);
}

function firstRow(data: unknown) {
  return Array.isArray(data) ? data[0] : data;
}

function isMissingStorageObject(error: { message?: string; statusCode?: string | number; status?: number }) {
  const status = Number(error.statusCode ?? error.status);
  return status === 404 || /not found|does not exist/i.test(error.message ?? "");
}

export class SupabaseInvitationMediaCleanupRepository implements InvitationMediaCleanupRepository {
  constructor(private readonly client: SupabaseClient) {}

  async reconcile(options: MediaLifecycleReconcileOptions): Promise<MediaLifecycleReconcileResult> {
    const { data, error } = await this.client.rpc("reconcile_image_media_lifecycle", {
      p_batch_size: options.batchSize,
      p_upload_timeout: options.uploadTimeout,
      p_processing_timeout: options.processingTimeout,
      p_failed_retention: options.failedRetention,
      p_ready_orphan_grace: options.readyOrphanGrace,
      p_reference_recheck_interval: options.referenceRecheckInterval,
    });
    if (error) fail(error, "Rekonsiliasi lifecycle media gagal.");
    const row = (firstRow(data) ?? {}) as Record<string, unknown>;
    return {
      scanned: Number(row.scanned ?? 0),
      timedOut: Number(row.timed_out ?? 0),
      failedQueued: Number(row.failed_queued ?? 0),
      temporaryOrphans: Number(row.temporary_orphans ?? 0),
      confirmedOrphans: Number(row.confirmed_orphans ?? 0),
      referencesRestored: Number(row.references_restored ?? 0),
    };
  }

  async claim(options: ClaimMediaCleanupOptions): Promise<ClaimedMediaCleanup[]> {
    const { data, error } = await this.client.rpc("claim_image_media_cleanup", {
      p_worker_id: options.workerId,
      p_batch_size: options.batchSize,
      p_lease_timeout: options.leaseTimeout,
      p_max_attempts: options.maxAttempts,
    });
    if (error) fail(error, "Claim batch cleanup media gagal.");
    return (data ?? []).map((row: Record<string, unknown>) => ({
      mediaId: String(row.media_id),
      invitationId: String(row.invitation_id),
      originalPath: String(row.original_path),
      variantPaths: Array.isArray(row.variant_paths) ? row.variant_paths.map(String) : [],
      claimToken: String(row.claim_token),
      attemptCount: Number(row.attempt_count),
    }));
  }

  async deleteVariants(paths: string[]) {
    if (paths.length === 0) return;
    await this.remove(paths, "variant");
  }

  async deleteOriginal(path: string) {
    await this.remove([path], "original");
  }

  async complete(mediaId: string, claimToken: string) {
    const { data, error } = await this.client.rpc("complete_image_media_cleanup", {
      p_media_id: mediaId,
      p_claim_token: claimToken,
    });
    if (error) fail(error, "Finalisasi metadata cleanup media gagal.");
    if (data !== "deleted" && data !== "reference_blocked") throw new Error("Outcome cleanup media tidak dikenal.");
    return data;
  }

  async fail(mediaId: string, claimToken: string, reason: string, maxAttempts: number) {
    const { data, error } = await this.client.rpc("fail_image_media_cleanup", {
      p_media_id: mediaId,
      p_claim_token: claimToken,
      p_reason: reason,
      p_max_attempts: maxAttempts,
    });
    if (error) fail(error, "Kegagalan cleanup media tidak dapat dicatat.");
    return Boolean(data);
  }

  async metrics(maxAttempts: number) {
    const { data, error } = await this.client.rpc("get_image_media_cleanup_metrics", { p_max_attempts: maxAttempts });
    if (error) fail(error, "Metrics cleanup media gagal dibaca.");
    return (data ?? {}) as Record<string, unknown>;
  }

  private async remove(paths: string[], label: string) {
    const { error } = await this.client.storage.from("invitation-media").remove(paths);
    if (error && !isMissingStorageObject(error)) fail(error, `Storage ${label} cleanup gagal.`);
  }
}
