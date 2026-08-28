import { randomUUID } from "node:crypto";
import type { MediaCleanupRunOptions } from "@/application/media-cleanup-service";

type Environment = Record<string, string | undefined>;

export type MediaCleanupRuntimeConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  scheduled: boolean;
  intervalMs: number;
  runLockLease: string;
  runOptions: MediaCleanupRunOptions;
};

function required(env: Environment, name: string) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} wajib tersedia untuk worker cleanup media.`);
  return value;
}

function integer(env: Environment, name: string, fallback: number, minimum: number, maximum: number) {
  const raw = env[name];
  const value = raw == null || raw === "" ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} harus integer ${minimum}-${maximum}.`);
  }
  return value;
}

function interval(env: Environment, name: string, fallback: string, allowZero = false) {
  const value = env[name]?.trim() || fallback;
  const match = value.match(/^(\d+)\s+(second|seconds|minute|minutes|hour|hours|day|days)$/i);
  if (!match || (!allowZero && Number(match[1]) === 0)) throw new Error(`${name} harus interval positif seperti "10 minutes".`);
  return value.toLowerCase();
}

function intervalMilliseconds(value: string) {
  const [, amount, unit] = value.match(/^(\d+)\s+(second|seconds|minute|minutes|hour|hours|day|days)$/i)!;
  const multiplier = unit.toLowerCase().startsWith("second") ? 1_000
    : unit.toLowerCase().startsWith("minute") ? 60_000
      : unit.toLowerCase().startsWith("hour") ? 3_600_000
        : 86_400_000;
  return Number(amount) * multiplier;
}

export function parseMediaCleanupConfig(env: Environment, scheduled: boolean): MediaCleanupRuntimeConfig {
  const supabaseUrl = required(env, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = required(env, "SUPABASE_SERVICE_ROLE_KEY");
  const host = new URL(supabaseUrl).hostname;
  const local = host === "127.0.0.1" || host === "localhost";
  if (!local && env.MEDIA_CLEANUP_ALLOW_REMOTE !== "true") {
    throw new Error("Worker menolak Supabase non-lokal tanpa MEDIA_CLEANUP_ALLOW_REMOTE=true.");
  }

  const workerId = env.MEDIA_CLEANUP_WORKER_ID?.trim() || randomUUID();
  const cleanupLease = interval(env, "MEDIA_CLEANUP_LEASE_TIMEOUT", "10 minutes");
  const runLockLease = interval(env, "MEDIA_CLEANUP_RUN_LOCK_LEASE", "30 minutes");
  if (intervalMilliseconds(runLockLease) < intervalMilliseconds(cleanupLease)) {
    throw new Error("MEDIA_CLEANUP_RUN_LOCK_LEASE tidak boleh lebih pendek dari claim lease.");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    scheduled,
    intervalMs: integer(env, "MEDIA_CLEANUP_INTERVAL_MS", 300_000, 10_000, 86_400_000),
    runLockLease,
    runOptions: {
      workerId,
      batchSize: integer(env, "MEDIA_CLEANUP_BATCH_SIZE", 25, 1, 100),
      concurrency: integer(env, "MEDIA_CLEANUP_CONCURRENCY", 4, 1, 16),
      maxBatches: integer(env, "MEDIA_CLEANUP_MAX_BATCHES", 20, 1, 100),
      maxAttempts: integer(env, "MEDIA_CLEANUP_MAX_ATTEMPTS", 8, 1, 20),
      leaseTimeout: cleanupLease,
      reconciliation: {
        batchSize: integer(env, "MEDIA_RECONCILE_BATCH_SIZE", 100, 1, 500),
        uploadTimeout: interval(env, "MEDIA_UPLOAD_TIMEOUT", "2 hours"),
        processingTimeout: interval(env, "MEDIA_PROCESSING_TIMEOUT", "1 hour"),
        failedRetention: interval(env, "MEDIA_FAILED_RETENTION", "24 hours", true),
        readyOrphanGrace: interval(env, "MEDIA_READY_ORPHAN_GRACE", "7 days"),
        referenceRecheckInterval: interval(env, "MEDIA_REFERENCE_RECHECK_INTERVAL", "1 hour", true),
      },
    },
  };
}
