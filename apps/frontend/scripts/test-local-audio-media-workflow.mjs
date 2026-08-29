import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function localStatus() {
  const output = execFileSync("supabase", ["status", "--workdir", "../..", "-o", "json"], {
    cwd: new URL("..", import.meta.url), encoding: "utf8", shell: process.platform === "win32",
  });
  const status = JSON.parse(output.slice(output.indexOf("{")));
  const host = new URL(status.API_URL).hostname;
  assert.ok(["127.0.0.1", "localhost"].includes(host), "Audio integration hanya boleh memakai Supabase lokal.");
  return status;
}

const client = (url, key) => createClient(url, key, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
const first = (data) => Array.isArray(data) ? data[0] : data;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const expectError = (result, label) => assert.ok(result.error, `${label} seharusnya ditolak.`);

async function createUser(admin, status, label) {
  const suffix = randomUUID().slice(0, 8);
  const email = `${label}-${suffix}@local.ngaturi.test`;
  const password = `Local-only-${suffix}-A1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: label } });
  if (created.error || !created.data.user) throw created.error ?? new Error("User lokal gagal dibuat.");
  const authenticated = client(status.API_URL, status.ANON_KEY);
  const signIn = await authenticated.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { id: created.data.user.id, client: authenticated };
}

async function createInvitation(owner, slug) {
  const result = await owner.rpc("claim_route_and_create_invitation", {
    p_slug: slug,
    p_title: "Audio media integration",
    p_template_key: "wedding-default",
    p_template_version: 1,
    p_content_schema_version: 2,
    p_theme_key: "wedding-default-default",
    p_theme_version: 1,
    p_content: {},
  });
  if (result.error) throw result.error;
  return first(result.data);
}

function audioPayload(ownerId, invitationId, bytes, overrides = {}) {
  const mediaId = overrides.mediaId ?? randomUUID();
  return {
    p_media_id: mediaId,
    p_invitation_id: invitationId,
    p_client_upload_id: overrides.clientUploadId ?? randomUUID(),
    p_original_filename: overrides.filename ?? "lagu-undangan.mp3",
    p_mime_type: overrides.mimeType ?? "audio/mpeg",
    p_size_bytes: bytes.byteLength,
    p_duration_ms: overrides.durationMs ?? 90_000,
    p_sha256: overrides.sha256 ?? sha256(bytes),
    p_content_signature: overrides.signature ?? "id3",
    p_original_path: `${ownerId}/${invitationId}/${mediaId}/original/${randomUUID()}.${overrides.extension ?? "mp3"}`,
  };
}

async function prepareReady(owner, ownerId, invitationId, bytes) {
  const payload = audioPayload(ownerId, invitationId, bytes);
  const prepared = await owner.rpc("prepare_audio_media_upload", payload);
  if (prepared.error) throw prepared.error;
  const row = first(prepared.data);
  assert.equal(row.reused, false);
  const signed = await owner.storage.from("invitation-media").createSignedUploadUrl(payload.p_original_path, { upsert: false });
  if (signed.error || !signed.data?.token) throw signed.error ?? new Error("Signed upload audio gagal.");
  const uploaded = await owner.storage.from("invitation-media").uploadToSignedUrl(payload.p_original_path, signed.data.token, bytes, { contentType: payload.p_mime_type, upsert: false });
  if (uploaded.error) throw uploaded.error;
  const begun = await owner.rpc("begin_image_media_processing", { p_invitation_id: invitationId, p_media_id: row.media_id });
  if (begun.error) throw begun.error;
  const completed = await owner.rpc("complete_audio_media_processing", { p_invitation_id: invitationId, p_media_id: row.media_id });
  if (completed.error) throw completed.error;
  return { mediaId: row.media_id, path: payload.p_original_path, payload };
}

async function main() {
  const status = localStatus();
  const admin = client(status.API_URL, status.SERVICE_ROLE_KEY);
  const guest = client(status.API_URL, status.ANON_KEY);
  const ownerUser = await createUser(admin, status, "audio-owner");
  const attacker = await createUser(admin, status, "audio-attacker");
  const invitation = await createInvitation(ownerUser.client, `audio-${randomUUID().slice(0, 8)}`);
  const bytes = new Uint8Array([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 8, 1, 2, 3, 4]);
  const payload = audioPayload(ownerUser.id, invitation.id, bytes);

  expectError(await guest.rpc("prepare_audio_media_upload", payload), "Guest prepare audio");
  expectError(await attacker.client.rpc("prepare_audio_media_upload", payload), "Non-owner prepare audio");
  expectError(await ownerUser.client.rpc("prepare_audio_media_upload", { ...payload, p_media_id: randomUUID(), p_client_upload_id: randomUUID(), p_content_signature: "mp4-ftyp" }), "MIME/signature mismatch");
  expectError(await ownerUser.client.rpc("prepare_audio_media_upload", { ...payload, p_media_id: randomUUID(), p_client_upload_id: randomUUID(), p_duration_ms: 900001 }), "Duration limit");

  const prepared = await ownerUser.client.rpc("prepare_audio_media_upload", payload);
  if (prepared.error) throw prepared.error;
  assert.equal(first(prepared.data).reused, false);
  const repeated = await ownerUser.client.rpc("prepare_audio_media_upload", payload);
  if (repeated.error) throw repeated.error;
  assert.equal(first(repeated.data).media_id, payload.p_media_id);
  assert.equal(first(repeated.data).reused, true);

  const signed = await ownerUser.client.storage.from("invitation-media").createSignedUploadUrl(payload.p_original_path, { upsert: false });
  if (signed.error || !signed.data?.token) throw signed.error ?? new Error("Signed upload audio gagal.");
  const upload = await ownerUser.client.storage.from("invitation-media").uploadToSignedUrl(payload.p_original_path, signed.data.token, bytes, { contentType: "audio/mpeg", upsert: false });
  if (upload.error) throw upload.error;
  const begin = await ownerUser.client.rpc("begin_image_media_processing", { p_invitation_id: invitation.id, p_media_id: payload.p_media_id });
  if (begin.error) throw begin.error;
  const complete = await ownerUser.client.rpc("complete_audio_media_processing", { p_invitation_id: invitation.id, p_media_id: payload.p_media_id });
  if (complete.error) throw complete.error;
  const idempotent = await ownerUser.client.rpc("complete_audio_media_processing", { p_invitation_id: invitation.id, p_media_id: payload.p_media_id });
  if (idempotent.error) throw idempotent.error;

  const ownerRead = await ownerUser.client.from("invitation_media").select("id,media_kind,media_purpose,status,duration_ms,quota_reserved_bytes").eq("id", payload.p_media_id).single();
  if (ownerRead.error) throw ownerRead.error;
  assert.deepEqual({ kind: ownerRead.data.media_kind, purpose: ownerRead.data.media_purpose, status: ownerRead.data.status }, { kind: "audio", purpose: "invitation_music", status: "ready" });
  assert.equal(ownerRead.data.quota_reserved_bytes, bytes.byteLength);
  const attackerRead = await attacker.client.from("invitation_media").select("id").eq("id", payload.p_media_id);
  if (attackerRead.error) throw attackerRead.error;
  assert.deepEqual(attackerRead.data, []);
  const draftGuest = await guest.rpc("get_published_invitation_audio", { p_media_id: payload.p_media_id });
  if (draftGuest.error) throw draftGuest.error;
  assert.deepEqual(draftGuest.data, []);

  const customContent = { modules: { music: { trackId: "custom", mediaId: payload.p_media_id } } };
  const published = await ownerUser.client.from("invitations").update({ content: customContent, status: "published" }).eq("id", invitation.id).select("updated_at").single();
  if (published.error) throw published.error;
  const publishedGuest = await guest.rpc("get_published_invitation_audio", { p_media_id: payload.p_media_id });
  if (publishedGuest.error) throw publishedGuest.error;
  assert.deepEqual(publishedGuest.data.map((row) => row.id), [payload.p_media_id]);
  expectError(await ownerUser.client.rpc("request_image_media_deletion", { p_invitation_id: invitation.id, p_media_id: payload.p_media_id, p_expected_invitation_updated_at: published.data.updated_at }), "Delete referenced audio");

  const replacement = await prepareReady(ownerUser.client, ownerUser.id, invitation.id, new Uint8Array([...bytes, 9]));
  expectError(await ownerUser.client.from("invitations").update({ content: { modules: { music: { trackId: "custom", mediaId: replacement.mediaId } }, hidden: payload.p_media_id } }).eq("id", invitation.id), "Multiple active custom audio references");
  const replaced = await ownerUser.client.from("invitations").update({ content: { modules: { music: { trackId: "custom", mediaId: replacement.mediaId } } } }).eq("id", invitation.id).select("updated_at").single();
  if (replaced.error) throw replaced.error;
  const deleteOld = await ownerUser.client.rpc("request_image_media_deletion", { p_invitation_id: invitation.id, p_media_id: payload.p_media_id, p_expected_invitation_updated_at: replaced.data.updated_at });
  if (deleteOld.error) throw deleteOld.error;

  const beforeCleanup = await admin.from("invitation_media_quota_usage").select("active_bytes").eq("invitation_id", invitation.id).single();
  if (beforeCleanup.error) throw beforeCleanup.error;
  const workerId = randomUUID();
  const claimed = await admin.rpc("claim_image_media_cleanup", { p_worker_id: workerId, p_batch_size: 10, p_lease_timeout: "10 minutes", p_max_attempts: 8 });
  if (claimed.error) throw claimed.error;
  const claim = claimed.data.find((row) => row.media_id === payload.p_media_id);
  assert.ok(claim, "DELETE_PENDING audio harus diklaim worker yang sama.");
  assert.deepEqual(claim.variant_paths, [], "Audio tidak membuat variant lifecycle terpisah.");
  const removed = await admin.storage.from("invitation-media").remove([claim.original_path]);
  if (removed.error) throw removed.error;
  const removedAgain = await admin.storage.from("invitation-media").remove([claim.original_path]);
  if (removedAgain.error) throw removedAgain.error;
  const cleaned = await admin.rpc("complete_image_media_cleanup", { p_media_id: claim.media_id, p_claim_token: claim.claim_token });
  if (cleaned.error) throw cleaned.error;
  assert.equal(cleaned.data, "deleted");
  const afterCleanup = await admin.from("invitation_media_quota_usage").select("active_bytes").eq("invitation_id", invitation.id).single();
  if (afterCleanup.error) throw afterCleanup.error;
  assert.equal(beforeCleanup.data.active_bytes - afterCleanup.data.active_bytes, bytes.byteLength, "Cleanup DELETED harus melepaskan reservation audio.");

  const routeQuota = await admin.from("profiles").update({ route_quota: 2 }).eq("id", ownerUser.id);
  if (routeQuota.error) throw routeQuota.error;
  const quotaInvitation = await createInvitation(ownerUser.client, `audio-quota-${randomUUID().slice(0, 8)}`);
  const quotaBytesA = new Uint8Array([...bytes, 20]);
  const quotaBytesB = new Uint8Array([...bytes, 21]);
  const quotaLimit = quotaBytesA.byteLength;
  const quotaUpdated = await admin.from("invitations").update({ media_quota_bytes: quotaLimit }).eq("id", quotaInvitation.id);
  if (quotaUpdated.error) throw quotaUpdated.error;
  const [quotaA, quotaB] = await Promise.all([
    ownerUser.client.rpc("prepare_audio_media_upload", audioPayload(ownerUser.id, quotaInvitation.id, quotaBytesA)),
    ownerUser.client.rpc("prepare_audio_media_upload", audioPayload(ownerUser.id, quotaInvitation.id, quotaBytesB)),
  ]);
  assert.equal([quotaA, quotaB].filter((result) => !result.error).length, 1, "Concurrent audio prepare tepat batas hanya boleh meloloskan satu reservation.");
  assert.equal([quotaA, quotaB].filter((result) => result.error?.message.includes("media_invitation_quota_exceeded")).length, 1);

  execFileSync("vitest", ["run", "tests/public-audio-local.integration.test.ts"], {
    cwd: new URL("..", import.meta.url), shell: process.platform === "win32", stdio: "inherit",
    env: { ...process.env, LOCAL_SUPABASE_INTEGRATION: "1", LOCAL_READY_AUDIO_ID: replacement.mediaId, NEXT_PUBLIC_SUPABASE_URL: status.API_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY },
  });

  console.log(JSON.stringify({ invitationId: invitation.id, readyAudioId: replacement.mediaId, validated: [
    "MIME signature and duration constraints", "signed direct upload", "UPLOADING to PROCESSING to READY", "owner RLS and unauthorized rejection", "published guest controlled delivery", "one referenced custom audio", "replace then DELETE_PENDING", "variant-free idempotent cleanup", "quota release after DELETED", "concurrent hard quota reservation",
  ] }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
