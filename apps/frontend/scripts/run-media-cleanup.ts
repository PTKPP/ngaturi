import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { parseMediaCleanupConfig } from "@/application/media-cleanup-config";
import { InvitationMediaCleanupService } from "@/application/media-cleanup-service";
import { SupabaseInvitationMediaCleanupRepository } from "@/repositories/supabase/media-cleanup-repository";

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, event: string, fields: Record<string, unknown> = {}) {
  const target = level === "error" ? console.error : console.log;
  target(JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields }));
}

async function main() {
  const scheduled = process.argv.includes("--schedule");
  const config = parseMediaCleanupConfig(process.env, scheduled);
  const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const service = new InvitationMediaCleanupService(new SupabaseInvitationMediaCleanupRepository(client));
  let stopping = false;
  let wakeScheduler: (() => void) | undefined;
  const stop = (signal: string) => {
    stopping = true;
    wakeScheduler?.();
    log("info", "media_cleanup_scheduler_stopping", { signal });
  };
  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  const execute = async () => {
    const runId = randomUUID();
    const startedAt = Date.now();
    log("info", "media_cleanup_run_started", { runId, workerId: config.runOptions.workerId });
    try {
      const outcome = await service.runExclusive(config.runOptions, config.runLockLease);
      const durationMs = Date.now() - startedAt;
      if (outcome.status === "skipped_overlap") {
        log("warn", "media_cleanup_run_skipped_overlap", { runId, workerId: config.runOptions.workerId, durationMs });
        return 0;
      }
      const { result } = outcome;
      const summary = {
        claimed: result.claimed,
        deleted: result.deleted,
        failed: result.failed,
        retried: result.retryScheduled,
        retryExhausted: result.retryExhausted,
        orphanDetected: result.reconciliation.temporaryOrphans + result.reconciliation.confirmedOrphans,
        durationMs,
      };
      const degraded = result.failed > 0 || result.failureRecordingErrors > 0;
      log(degraded ? "error" : "info", "media_cleanup_run_completed", {
        runId,
        workerId: result.workerId,
        summary,
        reconciliation: result.reconciliation,
        metrics: result.metrics,
      });
      return degraded ? 1 : 0;
    } catch (error) {
      const reason = error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) };
      log("error", "media_cleanup_run_failed", { runId, workerId: config.runOptions.workerId, durationMs: Date.now() - startedAt, error: reason });
      return 1;
    }
  };

  if (!config.scheduled) {
    process.exitCode = await execute();
    return;
  }

  log("info", "media_cleanup_scheduler_started", {
    workerId: config.runOptions.workerId,
    intervalMs: config.intervalMs,
    runLockLease: config.runLockLease,
  });
  while (!stopping) {
    const startedAt = Date.now();
    await execute();
    if (stopping) break;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, Math.max(0, config.intervalMs - (Date.now() - startedAt)));
      wakeScheduler = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    wakeScheduler = undefined;
  }
  log("info", "media_cleanup_scheduler_stopped", { workerId: config.runOptions.workerId });
}

main().catch((error) => {
  log("error", "media_cleanup_process_failed", {
    error: error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) },
  });
  process.exitCode = 1;
});
