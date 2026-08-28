import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { InvitationMediaCleanupService } from "@/application/media-cleanup-service";
import { SupabaseInvitationMediaCleanupRepository } from "@/repositories/supabase/media-cleanup-repository";

function integer(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${name} harus integer.`);
  return parsed;
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} wajib tersedia untuk worker cleanup media.`);
  return value;
}

async function main() {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
  const host = new URL(url).hostname;
  const local = host === "127.0.0.1" || host === "localhost";
  if (!local && process.env.MEDIA_CLEANUP_ALLOW_REMOTE !== "true") {
    throw new Error("Worker menolak Supabase non-lokal tanpa MEDIA_CLEANUP_ALLOW_REMOTE=true.");
  }

  const client = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const service = new InvitationMediaCleanupService(new SupabaseInvitationMediaCleanupRepository(client));
  const result = await service.runOnce({
    workerId: process.env.MEDIA_CLEANUP_WORKER_ID ?? randomUUID(),
    batchSize: integer("MEDIA_CLEANUP_BATCH_SIZE", 25),
    concurrency: integer("MEDIA_CLEANUP_CONCURRENCY", 4),
    maxBatches: integer("MEDIA_CLEANUP_MAX_BATCHES", 20),
    maxAttempts: integer("MEDIA_CLEANUP_MAX_ATTEMPTS", 8),
    leaseTimeout: process.env.MEDIA_CLEANUP_LEASE_TIMEOUT ?? "10 minutes",
    reconciliation: {
      batchSize: integer("MEDIA_RECONCILE_BATCH_SIZE", 100),
      uploadTimeout: process.env.MEDIA_UPLOAD_TIMEOUT ?? "2 hours",
      processingTimeout: process.env.MEDIA_PROCESSING_TIMEOUT ?? "1 hour",
      failedRetention: process.env.MEDIA_FAILED_RETENTION ?? "24 hours",
      readyOrphanGrace: process.env.MEDIA_READY_ORPHAN_GRACE ?? "7 days",
      referenceRecheckInterval: process.env.MEDIA_REFERENCE_RECHECK_INTERVAL ?? "1 hour",
    },
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.failed > 0 || result.failureRecordingErrors > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
