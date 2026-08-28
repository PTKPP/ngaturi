import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const frontendRoot = new URL("..", import.meta.url);

function localStatus() {
  const output = execFileSync(
    "supabase",
    ["status", "--workdir", "../..", "-o", "json"],
    { cwd: frontendRoot, encoding: "utf8", shell: process.platform === "win32" },
  );
  const jsonStart = output.indexOf("{");
  if (jsonStart < 0) throw new Error("Status Supabase lokal tidak menghasilkan JSON.");
  const status = JSON.parse(output.slice(jsonStart));
  const host = new URL(status.API_URL).hostname;
  assert.ok(["127.0.0.1", "localhost"].includes(host), "Lifecycle test hanya boleh memakai Supabase lokal.");
  return status;
}

function client(url, key) {
  return createClient(url, key, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
}

function oldTimestamp(days = 3) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function hash(label) {
  return createHash("sha256").update(`${label}-${randomUUID()}`).digest("hex");
}

async function insertMedia(admin, invitation, status, label, { withObjects = false, stateChangedAt = new Date().toISOString() } = {}) {
  const id = randomUUID();
  const root = `${invitation.owner_id}/${invitation.id}/${id}`;
  const paths = {
    original: `${root}/original/${randomUUID()}.png`,
    thumbnail: `${root}/variants/thumbnail-${randomUUID()}.webp`,
    medium: `${root}/variants/medium-${randomUUID()}.webp`,
    large: `${root}/variants/large-${randomUUID()}.webp`,
  };
  const originalBytes = new Uint8Array([137, 80, 78, 71, label.length]);
  const variantBytes = {
    thumbnail: new Uint8Array([82, 73, 70, 70, 1, label.length]),
    medium: new Uint8Array([82, 73, 70, 70, 2, label.length]),
    large: new Uint8Array([82, 73, 70, 70, 3, label.length]),
  };
  const mediaInsert = await admin.from("invitation_media").insert({
    id,
    invitation_id: invitation.id,
    owner_id: invitation.owner_id,
    storage_path: paths.original,
    mime_type: "image/png",
    size_bytes: originalBytes.byteLength,
    alt_text: label,
    status,
    client_upload_id: randomUUID(),
    original_filename: `${label}.png`,
    content_sha256: hash(label),
    width_px: 2,
    height_px: 2,
    failure_reason: status === "failed" ? `${label} failed` : null,
    ready_at: status === "ready" ? new Date().toISOString() : null,
    delete_requested_at: status === "delete_pending" ? new Date().toISOString() : null,
    delete_reason: status === "delete_pending" ? "failed_upload" : null,
    // Keep cleanup claims deterministic: PostgreSQL's transaction timestamp can
    // otherwise precede a freshly generated JavaScript timestamp by a few ms.
    next_attempt_at: status === "delete_pending" ? oldTimestamp(1) : null,
    lifecycle_state_changed_at: stateChangedAt,
  });
  if (mediaInsert.error) throw mediaInsert.error;

  const variantStatus = status;
  const variantInsert = await admin.from("invitation_media_variants").insert(
    ["thumbnail", "medium", "large"].map((key) => ({
      media_id: id,
      variant_key: key,
      storage_path: paths[key],
      target_width_px: 2,
      target_height_px: 2,
      width_px: status === "ready" || status === "delete_pending" ? 2 : null,
      height_px: status === "ready" || status === "delete_pending" ? 2 : null,
      size_bytes: status === "ready" || status === "delete_pending" ? variantBytes[key].byteLength : null,
      status: variantStatus,
    })),
  );
  if (variantInsert.error) throw variantInsert.error;

  if (withObjects) {
    const originalUpload = await admin.storage.from("invitation-media").upload(paths.original, originalBytes, { contentType: "image/png", upsert: false });
    if (originalUpload.error) throw originalUpload.error;
    for (const key of ["thumbnail", "medium", "large"]) {
      const uploaded = await admin.storage.from("invitation-media").upload(paths[key], variantBytes[key], { contentType: "image/webp", upsert: false });
      if (uploaded.error) throw uploaded.error;
    }
  }
  return { id, paths };
}

async function reconcile(admin, overrides = {}) {
  const result = await admin.rpc("reconcile_image_media_lifecycle", {
    p_batch_size: 100,
    p_upload_timeout: "1 hour",
    p_processing_timeout: "1 hour",
    p_failed_retention: "1 hour",
    p_ready_orphan_grace: "7 days",
    p_reference_recheck_interval: "0 seconds",
    ...overrides,
  });
  if (result.error) throw result.error;
  return Array.isArray(result.data) ? result.data[0] : result.data;
}

function runWorker(status, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--conditions=react-server", "--import", "tsx", "scripts/run-media-cleanup.ts"],
      {
        cwd: frontendRoot,
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
          SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
          MEDIA_RECONCILE_BATCH_SIZE: "1",
          MEDIA_REFERENCE_RECHECK_INTERVAL: "1 hour",
          ...extraEnv,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) return reject(new Error(`Worker exit ${code}: ${stderr || stdout}`));
      const jsonStart = stdout.indexOf("{");
      if (jsonStart < 0) return reject(new Error(`Worker tidak menghasilkan JSON: ${stdout}`));
      resolve(JSON.parse(stdout.slice(jsonStart)));
    });
  });
}

async function main() {
  const status = localStatus();
  const admin = client(status.API_URL, status.SERVICE_ROLE_KEY);
  const guest = client(status.API_URL, status.ANON_KEY);
  const unauthorizedResults = await Promise.all([
    guest.rpc("reconcile_image_media_lifecycle", { p_batch_size: 1 }),
    guest.rpc("claim_image_media_cleanup", { p_worker_id: randomUUID(), p_batch_size: 1 }),
    guest.rpc("complete_image_media_cleanup", { p_media_id: randomUUID(), p_claim_token: randomUUID() }),
    guest.rpc("fail_image_media_cleanup", { p_media_id: randomUUID(), p_claim_token: randomUUID(), p_reason: "unauthorized" }),
    guest.rpc("get_image_media_cleanup_metrics", {}),
    guest.from("invitation_media_storage_usage").select("invitation_id").limit(1),
  ]);
  assert.ok(unauthorizedResults.every((result) => result.error), "Lifecycle RPC/view harus menolak guest/anon.");
  const invitationResult = await admin.from("invitations")
    .select("id,owner_id,content,updated_at")
    .ilike("title", "Local media integration%")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (invitationResult.error) throw invitationResult.error;
  const invitation = invitationResult.data;

  const referencedResult = await admin.from("invitation_media")
    .select("id,status,orphan_detected_at,storage_path")
    .eq("invitation_id", invitation.id)
    .eq("status", "ready")
    .limit(1)
    .single();
  if (referencedResult.error) throw referencedResult.error;
  const referencedReady = referencedResult.data;
  assert.ok(JSON.stringify(invitation.content).includes(referencedReady.id), "Fixture lifecycle membutuhkan satu READY media yang direferensikan.");

  const existingPendingResult = await admin.from("invitation_media")
    .select("id,storage_path")
    .eq("invitation_id", invitation.id)
    .eq("status", "delete_pending");
  if (existingPendingResult.error) throw existingPendingResult.error;
  assert.ok(existingPendingResult.data.length >= 2, "Phase A harus meninggalkan DELETE_PENDING untuk lifecycle test.");

  const staleUploading = await insertMedia(admin, invitation, "uploading", "stale-uploading", { stateChangedAt: oldTimestamp() });
  const staleProcessing = await insertMedia(admin, invitation, "processing", "stale-processing", { stateChangedAt: oldTimestamp() });
  const failedOld = await insertMedia(admin, invitation, "failed", "failed-old", { stateChangedAt: oldTimestamp() });
  const readyOrphan = await insertMedia(admin, invitation, "ready", "ready-orphan", { withObjects: true });

  const firstReconcile = await reconcile(admin);
  assert.ok(firstReconcile.timed_out >= 2, "UPLOADING dan PROCESSING stale harus menjadi FAILED.");
  assert.ok(firstReconcile.failed_queued >= 1, "FAILED lama harus masuk DELETE_PENDING.");
  assert.ok(firstReconcile.temporary_orphans >= 1, "READY tanpa reference harus menjadi temporary orphan.");

  const afterFirst = await admin.from("invitation_media")
    .select("id,status,orphan_detected_at,orphan_confirmed_at")
    .in("id", [staleUploading.id, staleProcessing.id, failedOld.id, readyOrphan.id, referencedReady.id]);
  if (afterFirst.error) throw afterFirst.error;
  const byId = new Map(afterFirst.data.map((row) => [row.id, row]));
  assert.equal(byId.get(staleUploading.id).status, "failed");
  assert.equal(byId.get(staleProcessing.id).status, "failed");
  assert.equal(byId.get(failedOld.id).status, "delete_pending");
  assert.equal(byId.get(readyOrphan.id).status, "ready");
  assert.ok(byId.get(readyOrphan.id).orphan_detected_at);
  assert.equal(byId.get(readyOrphan.id).orphan_confirmed_at, null);
  assert.equal(byId.get(referencedReady.id).status, "ready");
  assert.equal(byId.get(referencedReady.id).orphan_detected_at, null);

  await reconcile(admin, { p_failed_retention: "0 seconds" });
  const ageOrphan = await admin.from("invitation_media").update({
    orphan_detected_at: oldTimestamp(8),
    reference_checked_at: oldTimestamp(8),
  }).eq("id", readyOrphan.id);
  if (ageOrphan.error) throw ageOrphan.error;
  const confirmReconcile = await reconcile(admin);
  assert.ok(confirmReconcile.confirmed_orphans >= 1, "Temporary orphan harus confirmed hanya setelah grace dan recheck.");

  const confirmed = await admin.from("invitation_media").select("status,orphan_confirmed_at,delete_reason").eq("id", readyOrphan.id).single();
  if (confirmed.error) throw confirmed.error;
  assert.equal(confirmed.data.status, "delete_pending");
  assert.ok(confirmed.data.orphan_confirmed_at);
  assert.equal(confirmed.data.delete_reason, "ready_orphan");

  const invalidReference = await admin.from("invitations").update({
    content: { ...invitation.content, invalidLifecycleReference: readyOrphan.id },
  }).eq("id", invitation.id);
  assert.ok(invalidReference.error, "Trigger harus menolak reference baru ke media non-READY.");

  const pendingBeforeWorkers = await admin.from("invitation_media")
    .select("id,storage_path")
    .eq("invitation_id", invitation.id)
    .eq("status", "delete_pending");
  if (pendingBeforeWorkers.error) throw pendingBeforeWorkers.error;
  assert.ok(pendingBeforeWorkers.data.length >= 5, "Lifecycle test membutuhkan beberapa row untuk dua worker.");

  const [workerA, workerB] = await Promise.all([
    runWorker(status, { MEDIA_CLEANUP_WORKER_ID: randomUUID(), MEDIA_CLEANUP_BATCH_SIZE: "2", MEDIA_CLEANUP_MAX_BATCHES: "1", MEDIA_CLEANUP_CONCURRENCY: "1" }),
    runWorker(status, { MEDIA_CLEANUP_WORKER_ID: randomUUID(), MEDIA_CLEANUP_BATCH_SIZE: "2", MEDIA_CLEANUP_MAX_BATCHES: "1", MEDIA_CLEANUP_CONCURRENCY: "1" }),
  ]);
  assert.ok(workerA.claimed > 0 && workerB.claimed > 0, "Dua worker harus memperoleh batch terpisah.");
  const makeRemainingEligible = await admin.from("invitation_media")
    .update({ next_attempt_at: oldTimestamp(1) })
    .eq("invitation_id", invitation.id)
    .eq("status", "delete_pending")
    .is("cleanup_claim_token", null);
  if (makeRemainingEligible.error) throw makeRemainingEligible.error;
  await runWorker(status, { MEDIA_CLEANUP_WORKER_ID: randomUUID(), MEDIA_CLEANUP_BATCH_SIZE: "25", MEDIA_CLEANUP_MAX_BATCHES: "20" });

  const cleanedTargets = [
    ...pendingBeforeWorkers.data.map((row) => row.id),
    staleUploading.id,
    staleProcessing.id,
    failedOld.id,
    readyOrphan.id,
  ];
  const cleanedResult = await admin.from("invitation_media").select("id,status,attempt_count,last_attempt_at,deleted_at").in("id", cleanedTargets);
  if (cleanedResult.error) throw cleanedResult.error;
  for (const row of cleanedResult.data) {
    assert.equal(row.status, "deleted", `Media ${row.id} harus menjadi tombstone deleted.`);
    assert.equal(row.attempt_count, 1, `Media ${row.id} tidak boleh diproses dua worker.`);
    assert.ok(row.last_attempt_at && row.deleted_at);
  }
  const orphanObject = await admin.storage.from("invitation-media").download(readyOrphan.paths.original);
  assert.ok(orphanObject.error, "Object READY orphan harus sudah dihapus.");
  for (const pending of existingPendingResult.data) {
    const object = await admin.storage.from("invitation-media").download(pending.storage_path);
    assert.ok(object.error, "Object DELETE_PENDING Phase A harus sudah dihapus.");
  }

  const preserved = await admin.from("invitation_media").select("status,orphan_detected_at,attempt_count").eq("id", referencedReady.id).single();
  if (preserved.error) throw preserved.error;
  assert.equal(preserved.data.status, "ready");
  assert.equal(preserved.data.orphan_detected_at, null);
  assert.equal(preserved.data.attempt_count, 0);

  const retryMedia = await insertMedia(admin, invitation, "delete_pending", "retry-bounded");
  const firstClaim = await admin.rpc("claim_image_media_cleanup", {
    p_worker_id: randomUUID(), p_batch_size: 1, p_lease_timeout: "10 minutes", p_max_attempts: 2,
  });
  if (firstClaim.error) throw firstClaim.error;
  assert.equal(firstClaim.data.length, 1);
  assert.equal(firstClaim.data[0].media_id, retryMedia.id);
  const firstFailure = await admin.rpc("fail_image_media_cleanup", {
    p_media_id: retryMedia.id,
    p_claim_token: firstClaim.data[0].claim_token,
    p_reason: "simulated storage failure one",
    p_max_attempts: 2,
  });
  if (firstFailure.error) throw firstFailure.error;
  assert.equal(firstFailure.data, true);
  const retryNow = await admin.from("invitation_media").update({ next_attempt_at: oldTimestamp(1) }).eq("id", retryMedia.id);
  if (retryNow.error) throw retryNow.error;
  const secondClaim = await admin.rpc("claim_image_media_cleanup", {
    p_worker_id: randomUUID(), p_batch_size: 1, p_lease_timeout: "10 minutes", p_max_attempts: 2,
  });
  if (secondClaim.error) throw secondClaim.error;
  assert.equal(secondClaim.data[0].media_id, retryMedia.id);
  const secondFailure = await admin.rpc("fail_image_media_cleanup", {
    p_media_id: retryMedia.id,
    p_claim_token: secondClaim.data[0].claim_token,
    p_reason: "simulated storage failure exhausted",
    p_max_attempts: 2,
  });
  if (secondFailure.error) throw secondFailure.error;
  assert.equal(secondFailure.data, false);
  const exhausted = await admin.from("invitation_media")
    .select("status,attempt_count,last_attempt_at,next_attempt_at,cleanup_failure_reason,cleanup_claim_token")
    .eq("id", retryMedia.id)
    .single();
  if (exhausted.error) throw exhausted.error;
  assert.equal(exhausted.data.attempt_count, 2);
  assert.ok(exhausted.data.last_attempt_at);
  assert.equal(exhausted.data.next_attempt_at, null);
  assert.equal(exhausted.data.cleanup_claim_token, null);
  assert.match(exhausted.data.cleanup_failure_reason, /exhausted/);
  const noThirdClaim = await admin.rpc("claim_image_media_cleanup", {
    p_worker_id: randomUUID(), p_batch_size: 10, p_lease_timeout: "10 minutes", p_max_attempts: 2,
  });
  if (noThirdClaim.error) throw noThirdClaim.error;
  assert.ok(noThirdClaim.data.every((row) => row.media_id !== retryMedia.id), "Retry exhausted tidak boleh diklaim lagi.");

  const concurrentA = await insertMedia(admin, invitation, "delete_pending", "claim-concurrent-a");
  const concurrentB = await insertMedia(admin, invitation, "delete_pending", "claim-concurrent-b");
  const [claimA, claimB] = await Promise.all([
    admin.rpc("claim_image_media_cleanup", { p_worker_id: randomUUID(), p_batch_size: 1, p_lease_timeout: "10 minutes", p_max_attempts: 8 }),
    admin.rpc("claim_image_media_cleanup", { p_worker_id: randomUUID(), p_batch_size: 1, p_lease_timeout: "10 minutes", p_max_attempts: 8 }),
  ]);
  if (claimA.error) throw claimA.error;
  if (claimB.error) throw claimB.error;
  assert.equal(claimA.data.length, 1);
  assert.equal(claimB.data.length, 1);
  assert.notEqual(claimA.data[0].media_id, claimB.data[0].media_id, "SKIP LOCKED/lease harus membagi claim.");
  assert.deepEqual(new Set([claimA.data[0].media_id, claimB.data[0].media_id]), new Set([concurrentA.id, concurrentB.id]));
  for (const claim of [claimA.data[0], claimB.data[0]]) {
    const completed = await admin.rpc("complete_image_media_cleanup", { p_media_id: claim.media_id, p_claim_token: claim.claim_token });
    if (completed.error) throw completed.error;
    assert.equal(completed.data, "deleted");
  }

  const metrics = await admin.rpc("get_image_media_cleanup_metrics", { p_max_attempts: 2 });
  if (metrics.error) throw metrics.error;
  assert.ok(Number(metrics.data.retryExhausted) >= 1);
  assert.equal(Number(metrics.data.claimed), 0);
  const usage = await admin.from("invitation_media_storage_usage").select("ready_media_count,ready_bytes,reserved_upload_bytes").eq("invitation_id", invitation.id).single();
  if (usage.error) throw usage.error;
  assert.ok(usage.data.ready_media_count >= 1 && Number(usage.data.ready_bytes) > 0);

  console.log(JSON.stringify({
    authorization: "service-role only",
    reconciliation: {
      staleUploading: "failed -> delete_pending -> deleted",
      staleProcessing: "failed -> delete_pending -> deleted",
      readyOrphan: "temporary -> confirmed -> deleted",
      referencedReady: "preserved",
    },
    workers: { first: workerA.claimed, second: workerB.claimed, noDuplicateAttempts: true },
    retry: { maxAttempts: 2, exhausted: true },
    metrics: metrics.data,
    quotaUsage: usage.data,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
