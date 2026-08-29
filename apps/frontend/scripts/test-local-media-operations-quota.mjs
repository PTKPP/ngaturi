import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const frontendRoot = new URL("..", import.meta.url);

function localStatus() {
  const output = execFileSync("supabase", ["status", "--workdir", "../..", "-o", "json"], {
    cwd: frontendRoot, encoding: "utf8", shell: process.platform === "win32",
  });
  const status = JSON.parse(output.slice(output.indexOf("{")));
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname), "Quota test hanya boleh memakai Supabase lokal.");
  return status;
}

function client(url, key) {
  return createClient(url, key, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
}

async function createOwner(admin, status, label) {
  const suffix = randomUUID().slice(0, 8);
  const email = `${label}-${suffix}@local.ngaturi.test`;
  const password = `Local-only-${suffix}-A1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: label } });
  if (created.error || !created.data.user) throw created.error ?? new Error("Owner quota gagal dibuat.");
  const owner = client(status.API_URL, status.ANON_KEY);
  const signedIn = await owner.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  const invitationResult = await owner.rpc("claim_route_and_create_invitation", {
    p_slug: `quota-${label}-${suffix}`,
    p_title: `Quota ${label}`,
    p_template_key: "daztore-inv1",
    p_template_version: 1,
    p_content_schema_version: 2,
    p_theme_key: "daztore-inv1-default",
    p_theme_version: 1,
    p_content: {},
  });
  if (invitationResult.error) throw invitationResult.error;
  const invitation = Array.isArray(invitationResult.data) ? invitationResult.data[0] : invitationResult.data;
  return { owner, ownerId: created.data.user.id, invitation };
}

function paths(ownerId, invitationId, mediaId) {
  const root = `${ownerId}/${invitationId}/${mediaId}`;
  return {
    original: `${root}/original/${randomUUID()}.png`,
    thumbnail: `${root}/variants/thumbnail-${randomUUID()}.webp`,
    medium: `${root}/variants/medium-${randomUUID()}.webp`,
    large: `${root}/variants/large-${randomUUID()}.webp`,
  };
}

function uploadPayload(ownerId, invitationId, seed, purpose = "gallery") {
  const mediaId = randomUUID();
  const storage = paths(ownerId, invitationId, mediaId);
  const bytes = new Uint8Array([137, 80, 78, 71, seed, 10, 26, 10]);
  return {
    mediaId,
    storage,
    rpc: {
      p_media_id: mediaId,
      p_invitation_id: invitationId,
      p_client_upload_id: randomUUID(),
      p_original_filename: `quota-${seed}.png`,
      p_mime_type: "image/png",
      p_size_bytes: bytes.byteLength,
      p_width_px: 2,
      p_height_px: 2,
      p_sha256: createHash("sha256").update(bytes).digest("hex"),
      p_alt_text: `Quota image ${seed}`,
      p_original_path: storage.original,
      p_variants: ["thumbnail", "medium", "large"].map((key) => ({ key, path: storage[key], targetWidth: 2, targetHeight: 2 })),
      p_media_purpose: purpose,
    },
  };
}

async function prepare(owner, payload) {
  return owner.rpc("prepare_image_media_upload", payload.rpc);
}

async function usage(admin, invitationId) {
  const result = await admin.from("invitation_media_quota_usage")
    .select("active_bytes,active_media_count,active_gallery_count")
    .eq("invitation_id", invitationId).single();
  if (result.error) throw result.error;
  return result.data;
}

function runWorker(status) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/run-media-cleanup.ts"], {
      cwd: frontendRoot,
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
        SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
        MEDIA_RECONCILE_BATCH_SIZE: "100",
        MEDIA_FAILED_RETENTION: "0 seconds",
        MEDIA_REFERENCE_RECHECK_INTERVAL: "0 seconds",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) return reject(new Error(stderr || stdout));
      const events = stdout.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
      const completed = events.findLast((event) => event.event === "media_cleanup_run_completed");
      if (!completed) return reject(new Error(`Completion log tidak ditemukan: ${stdout}`));
      resolve(completed.summary);
    });
  });
}

async function main() {
  const status = localStatus();
  const admin = client(status.API_URL, status.SERVICE_ROLE_KEY);
  const guest = client(status.API_URL, status.ANON_KEY);
  const reservationResult = await admin.rpc("image_media_quota_reservation", { p_original_bytes: 8, p_width_px: 2, p_height_px: 2 });
  if (reservationResult.error) throw reservationResult.error;
  const reservation = Number(reservationResult.data);
  assert.ok(reservation > 8);

  const exact = await createOwner(admin, status, "exact");
  const exactConfig = await admin.from("profiles").update({ media_quota_bytes: reservation * 3 }).eq("id", exact.ownerId);
  if (exactConfig.error) throw exactConfig.error;
  const exactInvitationConfig = await admin.from("invitations").update({ media_quota_bytes: reservation * 2, gallery_media_quota: 30 }).eq("id", exact.invitation.id);
  if (exactInvitationConfig.error) throw exactInvitationConfig.error;
  const exactA = uploadPayload(exact.ownerId, exact.invitation.id, 1);
  const exactB = uploadPayload(exact.ownerId, exact.invitation.id, 2);
  for (const payload of [exactA, exactB]) {
    const result = await prepare(exact.owner, payload);
    if (result.error) throw result.error;
  }
  assert.deepEqual(await usage(admin, exact.invitation.id), {
    active_bytes: reservation * 2, active_media_count: 2, active_gallery_count: 2,
  });
  const invitationExceeded = uploadPayload(exact.ownerId, exact.invitation.id, 3, "couple");
  const invitationExceededResult = await prepare(exact.owner, invitationExceeded);
  assert.match(invitationExceededResult.error?.message ?? "", /media_invitation_quota_exceeded/);
  const noSignedSlot = await exact.owner.storage.from("invitation-media").createSignedUploadUrl(invitationExceeded.storage.original, { upsert: false });
  assert.ok(noSignedSlot.error, "Quota rejection tidak boleh meninggalkan path yang dapat diberi signed upload token.");

  const raisedInvitation = await admin.from("invitations").update({ media_quota_bytes: reservation * 4 }).eq("id", exact.invitation.id);
  if (raisedInvitation.error) throw raisedInvitation.error;
  const exactUserBoundary = await prepare(exact.owner, uploadPayload(exact.ownerId, exact.invitation.id, 4, "couple"));
  if (exactUserBoundary.error) throw exactUserBoundary.error;
  const userExceeded = await prepare(exact.owner, uploadPayload(exact.ownerId, exact.invitation.id, 5, "couple"));
  assert.match(userExceeded.error?.message ?? "", /media_user_quota_exceeded/);

  const concurrent = await createOwner(admin, status, "concurrent");
  await admin.from("profiles").update({ media_quota_bytes: reservation * 10 }).eq("id", concurrent.ownerId);
  await admin.from("invitations").update({ media_quota_bytes: reservation, gallery_media_quota: 30 }).eq("id", concurrent.invitation.id);
  const [concurrentA, concurrentB] = await Promise.all([
    prepare(concurrent.owner, uploadPayload(concurrent.ownerId, concurrent.invitation.id, 11, "couple")),
    prepare(concurrent.owner, uploadPayload(concurrent.ownerId, concurrent.invitation.id, 12, "couple")),
  ]);
  assert.equal([concurrentA, concurrentB].filter((result) => !result.error).length, 1);
  assert.equal([concurrentA, concurrentB].filter((result) => /media_invitation_quota_exceeded/.test(result.error?.message ?? "")).length, 1);
  assert.equal((await usage(admin, concurrent.invitation.id)).active_media_count, 1);

  const gallery = await createOwner(admin, status, "gallery");
  await admin.from("profiles").update({ media_quota_bytes: reservation * 10 }).eq("id", gallery.ownerId);
  await admin.from("invitations").update({ media_quota_bytes: reservation * 10, gallery_media_quota: 1 }).eq("id", gallery.invitation.id);
  const galleryFirst = await prepare(gallery.owner, uploadPayload(gallery.ownerId, gallery.invitation.id, 21));
  if (galleryFirst.error) throw galleryFirst.error;
  const galleryExceeded = await prepare(gallery.owner, uploadPayload(gallery.ownerId, gallery.invitation.id, 22));
  assert.match(galleryExceeded.error?.message ?? "", /media_gallery_quota_exceeded/);

  const lifecycle = await createOwner(admin, status, "release");
  await admin.from("profiles").update({ media_quota_bytes: reservation }).eq("id", lifecycle.ownerId);
  await admin.from("invitations").update({ media_quota_bytes: reservation, gallery_media_quota: 1 }).eq("id", lifecycle.invitation.id);
  const lifecyclePayload = uploadPayload(lifecycle.ownerId, lifecycle.invitation.id, 31);
  const lifecyclePrepared = await prepare(lifecycle.owner, lifecyclePayload);
  if (lifecyclePrepared.error) throw lifecyclePrepared.error;
  const failed = await lifecycle.owner.rpc("fail_image_media_upload", {
    p_invitation_id: lifecycle.invitation.id, p_media_id: lifecyclePayload.mediaId, p_reason: "quota lifecycle test",
  });
  if (failed.error) throw failed.error;
  assert.equal((await usage(admin, lifecycle.invitation.id)).active_bytes, reservation, "FAILED harus tetap menahan quota.");
  const reconciled = await admin.rpc("reconcile_image_media_lifecycle", {
    p_batch_size: 100, p_failed_retention: "0 seconds", p_reference_recheck_interval: "0 seconds",
  });
  if (reconciled.error) throw reconciled.error;
  const pending = await admin.from("invitation_media").select("status").eq("id", lifecyclePayload.mediaId).single();
  if (pending.error) throw pending.error;
  assert.equal(pending.data.status, "delete_pending");
  assert.equal((await usage(admin, lifecycle.invitation.id)).active_bytes, reservation, "DELETE_PENDING harus tetap menahan quota.");
  const cleanupSummary = await runWorker(status);
  assert.ok(cleanupSummary.deleted >= 1);
  assert.deepEqual(await usage(admin, lifecycle.invitation.id), { active_bytes: 0, active_media_count: 0, active_gallery_count: 0 });

  const crashPayload = uploadPayload(lifecycle.ownerId, lifecycle.invitation.id, 32);
  const crashPrepared = await prepare(lifecycle.owner, crashPayload);
  if (crashPrepared.error) throw crashPrepared.error;
  await lifecycle.owner.rpc("fail_image_media_upload", {
    p_invitation_id: lifecycle.invitation.id, p_media_id: crashPayload.mediaId, p_reason: "simulated crash",
  });
  await admin.rpc("reconcile_image_media_lifecycle", { p_batch_size: 100, p_failed_retention: "0 seconds", p_reference_recheck_interval: "0 seconds" });
  const firstClaim = await admin.rpc("claim_image_media_cleanup", {
    p_worker_id: randomUUID(), p_batch_size: 1, p_lease_timeout: "1 second", p_max_attempts: 8,
  });
  if (firstClaim.error) throw firstClaim.error;
  assert.equal(firstClaim.data[0].media_id, crashPayload.mediaId);
  const expired = await admin.from("invitation_media").update({ cleanup_claimed_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", crashPayload.mediaId);
  if (expired.error) throw expired.error;
  const reclaimed = await admin.rpc("claim_image_media_cleanup", {
    p_worker_id: randomUUID(), p_batch_size: 1, p_lease_timeout: "1 second", p_max_attempts: 8,
  });
  if (reclaimed.error) throw reclaimed.error;
  assert.equal(reclaimed.data[0].media_id, crashPayload.mediaId);
  assert.equal(reclaimed.data[0].attempt_count, 2);
  const completed = await admin.rpc("complete_image_media_cleanup", {
    p_media_id: crashPayload.mediaId, p_claim_token: reclaimed.data[0].claim_token,
  });
  if (completed.error) throw completed.error;
  const repeatedComplete = await admin.rpc("complete_image_media_cleanup", {
    p_media_id: crashPayload.mediaId, p_claim_token: reclaimed.data[0].claim_token,
  });
  if (repeatedComplete.error) throw repeatedComplete.error;
  assert.equal(repeatedComplete.data, "deleted");
  assert.equal((await usage(admin, lifecycle.invitation.id)).active_bytes, 0, "Idempotent completion hanya melepas quota sekali.");

  const lockA = await admin.rpc("acquire_image_media_cleanup_run_lock", { p_holder_id: randomUUID(), p_lease_timeout: "30 minutes" });
  if (lockA.error) throw lockA.error;
  assert.ok(lockA.data);
  const lockB = await admin.rpc("acquire_image_media_cleanup_run_lock", { p_holder_id: randomUUID(), p_lease_timeout: "30 minutes" });
  if (lockB.error) throw lockB.error;
  assert.equal(lockB.data, null, "Run kedua harus skip ketika lock aktif.");
  const wrongRelease = await admin.rpc("release_image_media_cleanup_run_lock", { p_lock_token: randomUUID() });
  assert.equal(wrongRelease.data, false);
  const released = await admin.rpc("release_image_media_cleanup_run_lock", { p_lock_token: lockA.data });
  if (released.error) throw released.error;
  assert.equal(released.data, true);
  const lockAfterRelease = await admin.rpc("acquire_image_media_cleanup_run_lock", { p_holder_id: randomUUID(), p_lease_timeout: "30 minutes" });
  if (lockAfterRelease.error) throw lockAfterRelease.error;
  assert.ok(lockAfterRelease.data);
  await admin.rpc("release_image_media_cleanup_run_lock", { p_lock_token: lockAfterRelease.data });
  const unauthorizedLocks = await Promise.all([
    guest.rpc("acquire_image_media_cleanup_run_lock", { p_holder_id: randomUUID(), p_lease_timeout: "30 minutes" }),
    guest.rpc("release_image_media_cleanup_run_lock", { p_lock_token: randomUUID() }),
  ]);
  assert.ok(unauthorizedLocks.every((result) => result.error));

  const cascade = await createOwner(admin, status, "cascade");
  const cascadePayload = uploadPayload(cascade.ownerId, cascade.invitation.id, 41);
  const cascadePrepared = await prepare(cascade.owner, cascadePayload);
  if (cascadePrepared.error) throw cascadePrepared.error;
  const cascadeDelete = await admin.from("invitations").delete().eq("id", cascade.invitation.id);
  if (cascadeDelete.error) throw cascadeDelete.error;
  const cascadeOwnerUsage = await admin.from("owner_media_quota_usage").select("active_bytes,active_media_count").eq("owner_id", cascade.ownerId).single();
  if (cascadeOwnerUsage.error) throw cascadeOwnerUsage.error;
  assert.deepEqual(cascadeOwnerUsage.data, { active_bytes: 0, active_media_count: 0 }, "Cascade delete harus melepaskan quota owner tanpa parent invitation.");

  console.log(JSON.stringify({
    defaults: { userBytes: 524288000, invitationBytes: 209715200, galleryImages: 30 },
    reservationBytes: reservation,
    validated: [
      "quota exact boundary", "user/invitation/gallery exceed", "concurrent prepare serialization",
      "FAILED and DELETE_PENDING retain quota", "DELETED releases quota", "crash lease reclaim and idempotent completion",
      "distributed scheduler overlap lock", "signed upload unavailable after quota rejection", "invitation cascade releases owner quota",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
