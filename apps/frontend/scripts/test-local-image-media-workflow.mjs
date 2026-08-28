import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function localStatus() {
  const output = execFileSync(
    "supabase",
    ["status", "--workdir", "../..", "-o", "json"],
    { cwd: new URL("..", import.meta.url), encoding: "utf8", shell: process.platform === "win32" },
  );
  const jsonStart = output.indexOf("{");
  if (jsonStart < 0) throw new Error("Status Supabase lokal tidak menghasilkan JSON.");
  const status = JSON.parse(output.slice(jsonStart));
  const url = new URL(status.API_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname), "Integration test hanya boleh memakai Supabase lokal.");
  assert.ok(status.ANON_KEY && status.SERVICE_ROLE_KEY, "Key Supabase lokal tidak tersedia.");
  return status;
}

function client(url, key) {
  return createClient(url, key, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function storagePaths(ownerId, invitationId, mediaId, extension = "png") {
  const root = `${ownerId}/${invitationId}/${mediaId}`;
  return {
    original: `${root}/original/${randomUUID()}.${extension}`,
    thumbnail: `${root}/variants/thumbnail-${randomUUID()}.webp`,
    medium: `${root}/variants/medium-${randomUUID()}.webp`,
    large: `${root}/variants/large-${randomUUID()}.webp`,
  };
}

function variants(paths, width = 2, height = 2) {
  return ["thumbnail", "medium", "large"].map((key) => ({ key, path: paths[key], targetWidth: width, targetHeight: height }));
}

function rpcUploadPayload({ ownerId, invitationId, mediaId, clientUploadId, bytes, altText, paths, width = 2, height = 2, purpose = "gallery" }) {
  return {
    p_media_id: mediaId,
    p_invitation_id: invitationId,
    p_client_upload_id: clientUploadId,
    p_original_filename: "local-test.png",
    p_mime_type: "image/png",
    p_size_bytes: bytes.byteLength,
    p_width_px: width,
    p_height_px: height,
    p_sha256: sha256(bytes),
    p_alt_text: altText,
    p_original_path: paths.original,
    p_variants: variants(paths, width, height),
    p_media_purpose: purpose,
    ownerId,
  };
}

function withoutOwner(payload) {
  const rpcPayload = { ...payload };
  delete rpcPayload.ownerId;
  return rpcPayload;
}

function firstRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

function assertError(result, message) {
  assert.ok(result.error, `${message}: operasi seharusnya ditolak.`);
  return result.error;
}

async function createLocalUser(admin, apiUrl, anonKey, label, suffix) {
  const email = `${label}-${suffix}@local.ngaturi.test`;
  const password = `Local-only-${suffix}-A1!`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: `${label} integration` },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error(`User ${label} gagal dibuat.`);
  const authenticated = client(apiUrl, anonKey);
  const signedIn = await authenticated.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { client: authenticated, id: created.data.user.id };
}

async function signedUpload(supabase, path, bytes, contentType) {
  const signed = await supabase.storage.from("invitation-media").createSignedUploadUrl(path, { upsert: false });
  if (signed.error || !signed.data?.token) throw signed.error ?? new Error(`Signed upload ${path} gagal dibuat.`);
  const uploaded = await supabase.storage.from("invitation-media").uploadToSignedUrl(path, signed.data.token, bytes, { contentType, upsert: false });
  if (uploaded.error) throw uploaded.error;
  return signed.data.token;
}

async function uploadAll(supabase, paths, originalBytes, variantBytes) {
  await signedUpload(supabase, paths.original, originalBytes, "image/png");
  for (const key of ["thumbnail", "medium", "large"]) {
    await signedUpload(supabase, paths[key], variantBytes[key], "image/webp");
  }
}

async function finalize(supabase, invitationId, mediaId, originalBytes, variantBytes) {
  const begun = await supabase.rpc("begin_image_media_processing", { p_invitation_id: invitationId, p_media_id: mediaId });
  if (begun.error) throw begun.error;
  const objects = [
    { key: "original", sizeBytes: originalBytes.byteLength, width: 2, height: 2 },
    ...["thumbnail", "medium", "large"].map((key) => ({ key, sizeBytes: variantBytes[key].byteLength, width: 2, height: 2 })),
  ];
  const completed = await supabase.rpc("complete_image_media_processing", {
    p_invitation_id: invitationId,
    p_media_id: mediaId,
    p_objects: objects,
  });
  if (completed.error) throw completed.error;
  return objects;
}

async function prepareReadyMedia(owner, ownerId, invitationId, seed, altText) {
  const mediaId = randomUUID();
  const paths = storagePaths(ownerId, invitationId, mediaId);
  const originalBytes = new Uint8Array([137, 80, 78, 71, seed, 10, 26, 10]);
  const variantBytes = {
    thumbnail: new Uint8Array([82, 73, 70, 70, seed, 1]),
    medium: new Uint8Array([82, 73, 70, 70, seed, 2, 2]),
    large: new Uint8Array([82, 73, 70, 70, seed, 3, 3, 3]),
  };
  const payload = rpcUploadPayload({ ownerId, invitationId, mediaId, clientUploadId: randomUUID(), bytes: originalBytes, altText, paths });
  const prepared = await owner.rpc("prepare_image_media_upload", withoutOwner(payload));
  if (prepared.error) throw prepared.error;
  assert.equal(firstRow(prepared.data).reused, false, "Upload pertama tidak boleh dianggap reuse.");
  await uploadAll(owner, paths, originalBytes, variantBytes);
  const objects = await finalize(owner, invitationId, mediaId, originalBytes, variantBytes);
  return { mediaId, paths, originalBytes, variantBytes, payload, objects };
}

async function main() {
  const status = localStatus();
  const admin = client(status.API_URL, status.SERVICE_ROLE_KEY);
  const guest = client(status.API_URL, status.ANON_KEY);
  const suffix = randomUUID().slice(0, 8);
  const ownerUser = await createLocalUser(admin, status.API_URL, status.ANON_KEY, "owner", suffix);
  const attackerUser = await createLocalUser(admin, status.API_URL, status.ANON_KEY, "attacker", suffix);
  const owner = ownerUser.client;
  const attacker = attackerUser.client;

  const createdInvitation = await owner.rpc("claim_route_and_create_invitation", {
    p_slug: `media-${suffix}`,
    p_title: "Local media integration",
    p_template_key: "daztore-inv1",
    p_template_version: 1,
    p_content_schema_version: 2,
    p_theme_key: "daztore-inv1-default",
    p_theme_version: 1,
    p_content: {},
  });
  if (createdInvitation.error) throw createdInvitation.error;
  const invitation = firstRow(createdInvitation.data);
  assert.ok(invitation?.id, "Invitation lokal gagal dibuat.");

  const originalBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const mediaId = randomUUID();
  const clientUploadId = randomUUID();
  const paths = storagePaths(ownerUser.id, invitation.id, mediaId);
  const payload = rpcUploadPayload({
    ownerId: ownerUser.id,
    invitationId: invitation.id,
    mediaId,
    clientUploadId,
    bytes: originalBytes,
    altText: "Foto pasangan utama",
    paths,
  });

  assertError(await guest.rpc("prepare_image_media_upload", withoutOwner(payload)), "Guest prepare");
  assertError(await attacker.rpc("prepare_image_media_upload", withoutOwner(payload)), "Non-owner prepare");
  assertError(await owner.rpc("prepare_image_media_upload", {
    ...withoutOwner(payload),
    p_media_id: randomUUID(),
    p_client_upload_id: randomUUID(),
    p_mime_type: "image/svg+xml",
  }), "MIME executable");
  assertError(await owner.rpc("prepare_image_media_upload", {
    ...withoutOwner(payload),
    p_media_id: randomUUID(),
    p_client_upload_id: randomUUID(),
    p_original_path: `${ownerUser.id}/${invitation.id}/unsafe.png`,
  }), "Unsafe path");

  const prepared = await owner.rpc("prepare_image_media_upload", withoutOwner(payload));
  if (prepared.error) throw prepared.error;
  assert.equal(firstRow(prepared.data).media_id, mediaId);
  assert.equal(firstRow(prepared.data).reused, false);

  const repeated = await owner.rpc("prepare_image_media_upload", withoutOwner(payload));
  if (repeated.error) throw repeated.error;
  assert.equal(firstRow(repeated.data).media_id, mediaId);
  assert.equal(firstRow(repeated.data).reused, true, "Client upload ID harus idempotent.");

  const sameHashPaths = storagePaths(ownerUser.id, invitation.id, randomUUID());
  const sameHash = await owner.rpc("prepare_image_media_upload", withoutOwner({
    ...payload,
    p_media_id: randomUUID(),
    p_client_upload_id: randomUUID(),
    p_original_path: sameHashPaths.original,
    p_variants: variants(sameHashPaths),
  }));
  if (sameHash.error) throw sameHash.error;
  assert.equal(firstRow(sameHash.data).media_id, mediaId);
  assert.equal(firstRow(sameHash.data).reused, true, "SHA-256 duplicate harus reuse row aktif.");

  assertError(await owner.from("invitation_media").insert({
    invitation_id: invitation.id,
    owner_id: ownerUser.id,
    storage_path: `${ownerUser.id}/${invitation.id}/${randomUUID()}/direct.png`,
    mime_type: "image/png",
    size_bytes: 1,
    alt_text: "Direct insert",
    original_filename: "direct.png",
  }), "Direct metadata insert");

  const attackerRows = await attacker.from("invitation_media").select("id").eq("invitation_id", invitation.id);
  if (attackerRows.error) throw attackerRows.error;
  assert.deepEqual(attackerRows.data, [], "RLS metadata harus menyembunyikan media owner lain.");
  const attackerVariants = await attacker.from("invitation_media_variants").select("id").eq("media_id", mediaId);
  if (attackerVariants.error) throw attackerVariants.error;
  assert.deepEqual(attackerVariants.data, [], "RLS variant harus menyembunyikan media owner lain.");
  assertError(await guest.from("invitation_media").select("id").eq("id", mediaId), "Guest metadata select");

  const unauthorizedSigned = await attacker.storage.from("invitation-media").createSignedUploadUrl(paths.original, { upsert: false });
  if (!unauthorizedSigned.error && unauthorizedSigned.data?.token) {
    assertError(await attacker.storage.from("invitation-media").uploadToSignedUrl(paths.original, unauthorizedSigned.data.token, originalBytes, { contentType: "image/png" }), "Non-owner signed upload");
  }
  const arbitraryPath = `${ownerUser.id}/${invitation.id}/${randomUUID()}/original/${randomUUID()}.png`;
  const arbitrarySigned = await owner.storage.from("invitation-media").createSignedUploadUrl(arbitraryPath, { upsert: false });
  if (!arbitrarySigned.error && arbitrarySigned.data?.token) {
    assertError(await owner.storage.from("invitation-media").uploadToSignedUrl(arbitraryPath, arbitrarySigned.data.token, originalBytes, { contentType: "image/png" }), "Upload tanpa metadata");
  }

  const variantBytes = {
    thumbnail: new Uint8Array([82, 73, 70, 70, 1, 1]),
    medium: new Uint8Array([82, 73, 70, 70, 2, 2, 2]),
    large: new Uint8Array([82, 73, 70, 70, 3, 3, 3, 3]),
  };
  const originalToken = await signedUpload(owner, paths.original, originalBytes, "image/png");
  assertError(await owner.storage.from("invitation-media").uploadToSignedUrl(paths.original, originalToken, originalBytes, { contentType: "image/png", upsert: false }), "Signed upload overwrite");
  for (const key of ["thumbnail", "medium", "large"]) await signedUpload(owner, paths[key], variantBytes[key], "image/webp");

  const objects = await finalize(owner, invitation.id, mediaId, originalBytes, variantBytes);
  const idempotentBegin = await owner.rpc("begin_image_media_processing", { p_invitation_id: invitation.id, p_media_id: mediaId });
  if (idempotentBegin.error) throw idempotentBegin.error;
  assert.equal(idempotentBegin.data, "ready");
  const idempotentComplete = await owner.rpc("complete_image_media_processing", {
    p_invitation_id: invitation.id,
    p_media_id: mediaId,
    p_objects: objects,
  });
  if (idempotentComplete.error) throw idempotentComplete.error;

  const ready = await owner.from("invitation_media").select("id,status,alt_text,invitation_media_variants(variant_key,status)").eq("id", mediaId).single();
  if (ready.error) throw ready.error;
  assert.equal(ready.data.status, "ready");
  assert.equal(ready.data.invitation_media_variants.length, 3);
  assert.ok(ready.data.invitation_media_variants.every((variant) => variant.status === "ready"));
  const ownerDownload = await owner.storage.from("invitation-media").download(paths.original);
  if (ownerDownload.error) throw ownerDownload.error;
  assert.equal(ownerDownload.data.size, originalBytes.byteLength);
  assertError(await guest.storage.from("invitation-media").download(paths.original), "Guest private object read");
  await owner.storage.from("invitation-media").remove([paths.original]);
  const afterOwnerDeleteAttempt = await owner.storage.from("invitation-media").download(paths.original);
  if (afterOwnerDeleteAttempt.error) throw new Error("Owner delete sinkron seharusnya tidak menghapus object karena policy DELETE tidak tersedia.");

  const unpublishedPublic = await guest.rpc("get_published_invitation_media", { p_invitation_id: invitation.id });
  if (unpublishedPublic.error) throw unpublishedPublic.error;
  assert.deepEqual(unpublishedPublic.data, [], "Guest tidak boleh melihat media draft.");

  const published = await owner.from("invitations").update({ content: { gallery: [{ mediaId }] }, status: "published" })
    .eq("id", invitation.id).select("id,status,updated_at").single();
  if (published.error) throw published.error;
  assert.equal(published.data.status, "published");
  const publishedPublic = await guest.rpc("get_published_invitation_media", { p_invitation_id: invitation.id });
  if (publishedPublic.error) throw publishedPublic.error;
  assert.deepEqual(publishedPublic.data.map((row) => row.id), [mediaId], "Guest published lookup harus mengembalikan media referenced.");

  assertError(await owner.rpc("request_image_media_deletion", {
    p_invitation_id: invitation.id,
    p_media_id: mediaId,
    p_expected_invitation_updated_at: published.data.updated_at,
  }), "Delete media referenced");

  const replacement = await prepareReadyMedia(owner, ownerUser.id, invitation.id, 21, "Foto pasangan pengganti");
  const replaced = await owner.from("invitations").update({ content: { couple: { photoMediaId: replacement.mediaId } } })
    .eq("id", invitation.id).select("updated_at").single();
  if (replaced.error) throw replaced.error;
  const deletion = await owner.rpc("request_image_media_deletion", {
    p_invitation_id: invitation.id,
    p_media_id: mediaId,
    p_expected_invitation_updated_at: replaced.data.updated_at,
  });
  if (deletion.error) throw deletion.error;
  const repeatedDeletion = await owner.rpc("request_image_media_deletion", {
    p_invitation_id: invitation.id,
    p_media_id: mediaId,
    p_expected_invitation_updated_at: replaced.data.updated_at,
  });
  if (repeatedDeletion.error) throw repeatedDeletion.error;
  const deletePending = await owner.from("invitation_media").select("status,invitation_media_variants(status)").eq("id", mediaId).single();
  if (deletePending.error) throw deletePending.error;
  assert.equal(deletePending.data.status, "delete_pending");
  assert.ok(deletePending.data.invitation_media_variants.every((variant) => variant.status === "delete_pending"));
  const replacementPublic = await guest.rpc("get_published_invitation_media", { p_invitation_id: invitation.id });
  if (replacementPublic.error) throw replacementPublic.error;
  assert.deepEqual(replacementPublic.data.map((row) => row.id), [replacement.mediaId]);

  const staleVersion = replaced.data.updated_at;
  const touched = await owner.from("invitations").update({ title: "Local media integration touched" }).eq("id", invitation.id).select("updated_at").single();
  if (touched.error) throw touched.error;
  assert.notEqual(touched.data.updated_at, staleVersion);
  assertError(await owner.rpc("request_image_media_deletion", {
    p_invitation_id: invitation.id,
    p_media_id: replacement.mediaId,
    p_expected_invitation_updated_at: staleVersion,
  }), "Stale invitation delete");

  const partialId = randomUUID();
  const partialPaths = storagePaths(ownerUser.id, invitation.id, partialId);
  const partialBytes = new Uint8Array([137, 80, 78, 71, 31]);
  const partialPayload = rpcUploadPayload({
    ownerId: ownerUser.id,
    invitationId: invitation.id,
    mediaId: partialId,
    clientUploadId: randomUUID(),
    bytes: partialBytes,
    altText: "Upload parsial",
    paths: partialPaths,
  });
  const partialPrepared = await owner.rpc("prepare_image_media_upload", withoutOwner(partialPayload));
  if (partialPrepared.error) throw partialPrepared.error;
  await signedUpload(owner, partialPaths.original, partialBytes, "image/png");
  const partialBegin = await owner.rpc("begin_image_media_processing", { p_invitation_id: invitation.id, p_media_id: partialId });
  if (partialBegin.error) throw partialBegin.error;
  assertError(await owner.rpc("complete_image_media_processing", {
    p_invitation_id: invitation.id,
    p_media_id: partialId,
    p_objects: [{ key: "original", sizeBytes: partialBytes.byteLength, width: 2, height: 2 }],
  }), "Partial finalize");
  const failed = await owner.rpc("fail_image_media_upload", {
    p_invitation_id: invitation.id,
    p_media_id: partialId,
    p_reason: "Integration partial upload",
  });
  if (failed.error) throw failed.error;
  const failedRow = await owner.from("invitation_media").select("status,failure_reason").eq("id", partialId).single();
  if (failedRow.error) throw failedRow.error;
  assert.equal(failedRow.data.status, "failed");
  assert.match(failedRow.data.failure_reason, /partial upload/i);
  const failedDeletion = await owner.rpc("request_image_media_deletion", {
    p_invitation_id: invitation.id,
    p_media_id: partialId,
    p_expected_invitation_updated_at: touched.data.updated_at,
  });
  if (failedDeletion.error) throw failedDeletion.error;

  const raceBytes = new Uint8Array([137, 80, 78, 71, 41]);
  const raceAId = randomUUID();
  const raceBId = randomUUID();
  const raceAPaths = storagePaths(ownerUser.id, invitation.id, raceAId);
  const raceBPaths = storagePaths(ownerUser.id, invitation.id, raceBId);
  const raceBase = { ownerId: ownerUser.id, invitationId: invitation.id, clientUploadId: randomUUID(), bytes: raceBytes, altText: "Concurrent duplicate" };
  const [raceA, raceB] = await Promise.all([
    owner.rpc("prepare_image_media_upload", withoutOwner(rpcUploadPayload({ ...raceBase, mediaId: raceAId, paths: raceAPaths }))),
    owner.rpc("prepare_image_media_upload", withoutOwner(rpcUploadPayload({ ...raceBase, mediaId: raceBId, clientUploadId: randomUUID(), paths: raceBPaths }))),
  ]);
  if (raceA.error) throw raceA.error;
  if (raceB.error) throw raceB.error;
  assert.equal(firstRow(raceA.data).media_id, firstRow(raceB.data).media_id, "Concurrent SHA prepare harus converge ke satu row.");
  const raceId = firstRow(raceA.data).media_id;
  const raceFail = await owner.rpc("fail_image_media_upload", { p_invitation_id: invitation.id, p_media_id: raceId, p_reason: "Concurrent test cleanup" });
  if (raceFail.error) throw raceFail.error;

  execFileSync("vitest", ["run", "tests/public-media-local.integration.test.ts"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      LOCAL_SUPABASE_INTEGRATION: "1",
      LOCAL_READY_MEDIA_ID: replacement.mediaId,
      LOCAL_DELETE_PENDING_MEDIA_ID: mediaId,
      NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  console.log(JSON.stringify({
    invitationId: invitation.id,
    readyMediaId: replacement.mediaId,
    deletePendingMedia: [mediaId, partialId],
    validated: [
      "schema constraints",
      "RPC authorization and idempotency",
      "metadata and variant RLS",
      "Storage signed upload policy",
      "original and variant upload",
      "READY finalize and repeat finalize",
      "owner private read",
      "guest published metadata read",
      "guest published HTTP delivery",
      "guest and non-owner rejection",
      "replace and DELETE_PENDING",
      "referenced-delete rejection",
      "partial upload failure",
      "concurrent duplicate prepare",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
