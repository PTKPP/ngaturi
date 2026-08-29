import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function localStatus() {
  const output = execFileSync("supabase", ["status", "--workdir", "../..", "-o", "json"], {
    cwd: new URL("..", import.meta.url), encoding: "utf8", shell: process.platform === "win32",
  });
  const status = JSON.parse(output.slice(output.indexOf("{")));
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname), "Wishes integration hanya boleh memakai Supabase lokal.");
  return status;
}

const client = (url, key) => createClient(url, key, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
const first = (data) => Array.isArray(data) ? data[0] : data;
const sourceHash = (value) => createHash("sha256").update(value).digest("hex");
const expectError = (result, label, pattern) => {
  assert.ok(result.error, `${label} seharusnya ditolak.`);
  if (pattern) assert.match(result.error.message, pattern, `${label} menghasilkan error yang salah.`);
};

async function createUser(admin, status, label) {
  const suffix = randomUUID().slice(0, 8);
  const email = `${label}-${suffix}@local.ngaturi.test`;
  const password = `Local-only-${suffix}-A1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: label } });
  if (created.error || !created.data.user) throw created.error ?? new Error("User lokal gagal dibuat.");
  const authenticated = client(status.API_URL, status.ANON_KEY);
  const signedIn = await authenticated.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { id: created.data.user.id, client: authenticated };
}

async function createInvitation(owner, slug) {
  const result = await owner.rpc("claim_route_and_create_invitation", {
    p_slug: slug,
    p_title: "Wishes integration",
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

async function setStatus(owner, invitationId, value) {
  const result = await owner.from("invitations").update({ status: value }).eq("id", invitationId).select("id,status,published_at").single();
  if (result.error) throw result.error;
  return result.data;
}

function submission(invitationId, overrides = {}) {
  return {
    p_invitation_id: invitationId,
    p_client_submission_id: overrides.clientSubmissionId ?? randomUUID(),
    p_guest_name: overrides.guestName ?? "Tamu Undangan",
    p_message: overrides.message ?? "Semoga menjadi keluarga yang penuh berkah.",
    p_source_hash: overrides.sourceHash ?? sourceHash(randomUUID()),
  };
}

const submit = (admin, payload) => admin.rpc("submit_public_invitation_wish", payload);
const publicList = (admin, invitationId, cursor = null, limit = 11) => admin.rpc("list_public_approved_invitation_wishes", {
  p_invitation_id: invitationId,
  p_limit: limit,
  p_before_created_at: cursor?.created_at ?? null,
  p_before_id: cursor?.id ?? null,
});
const moderate = (admin, ownerId, invitationId, wish, status) => admin.rpc("moderate_owned_invitation_wish", {
  p_owner_id: ownerId,
  p_invitation_id: invitationId,
  p_wish_id: wish.id,
  p_status: status,
  p_expected_updated_at: wish.updated_at,
});

async function storedWish(admin, invitationId, clientSubmissionId) {
  const result = await admin.from("invitation_wishes").select("id,guest_name,message,status,created_at,updated_at").eq("invitation_id", invitationId).eq("client_submission_id", clientSubmissionId).single();
  if (result.error) throw result.error;
  return result.data;
}

async function main() {
  const status = localStatus();
  const admin = client(status.API_URL, status.SERVICE_ROLE_KEY);
  const guest = client(status.API_URL, status.ANON_KEY);
  const owner = await createUser(admin, status, "wishes-owner");
  const attacker = await createUser(admin, status, "wishes-attacker");
  const quota = await admin.from("profiles").update({ route_quota: 6 }).eq("id", owner.id);
  if (quota.error) throw quota.error;

  const invitation = await createInvitation(owner.client, `wishes-${randomUUID().slice(0, 8)}`);
  const draftPayload = submission(invitation.id);
  expectError(await submit(admin, draftPayload), "Draft submission", /wish_invitation_not_available/);
  expectError(await publicList(admin, invitation.id), "Draft public list", /wish_invitation_not_available/);
  expectError(await guest.rpc("submit_public_invitation_wish", draftPayload), "Anonymous direct submit RPC");
  expectError(await owner.client.rpc("submit_public_invitation_wish", draftPayload), "Authenticated direct submit RPC");

  const published = await setStatus(owner.client, invitation.id, "published");
  assert.ok(published.published_at);
  expectError(await submit(admin, submission(invitation.id, { guestName: "A" })), "Nama terlalu pendek", /invalid_wish_submission/);
  expectError(await submit(admin, submission(invitation.id, { message: "A" })), "Pesan terlalu pendek", /invalid_wish_submission/);
  expectError(await submit(admin, submission(invitation.id, { message: "x".repeat(1001) })), "Pesan terlalu panjang", /invalid_wish_submission/);
  expectError(await submit(admin, submission(invitation.id, { message: "Pesan\nberbaris" })), "Control character", /invalid_wish_submission/);

  const idempotentId = randomUUID();
  const normalized = submission(invitation.id, {
    clientSubmissionId: idempotentId,
    guestName: "  Tamu   Satu  ",
    message: "  Semoga   selalu bahagia.  ",
    sourceHash: sourceHash("wish-idempotent"),
  });
  const accepted = await submit(admin, normalized);
  if (accepted.error) throw accepted.error;
  assert.equal(first(accepted.data).idempotent, false);
  const repeated = await submit(admin, normalized);
  if (repeated.error) throw repeated.error;
  assert.equal(first(repeated.data).wish_id, first(accepted.data).wish_id);
  assert.equal(first(repeated.data).idempotent, true);
  expectError(await submit(admin, { ...normalized, p_message: "Payload berubah" }), "Idempotency conflict", /wish_idempotency_conflict/);
  const normalizedStored = await storedWish(admin, invitation.id, idempotentId);
  assert.equal(normalizedStored.guest_name, "Tamu Satu");
  assert.equal(normalizedStored.message, "Semoga selalu bahagia.");
  assert.equal(normalizedStored.status, "pending", "Submission baru wajib pending.");

  const concurrentId = randomUUID();
  const concurrentPayload = submission(invitation.id, { clientSubmissionId: concurrentId, sourceHash: sourceHash("wish-concurrent-submit") });
  const concurrentSame = await Promise.all([submit(admin, concurrentPayload), submit(admin, concurrentPayload)]);
  for (const result of concurrentSame) if (result.error) throw result.error;
  assert.equal(new Set(concurrentSame.map((result) => first(result.data).wish_id)).size, 1, "Concurrent retry harus converge ke satu wish.");

  const hiddenPending = await publicList(admin, invitation.id);
  if (hiddenPending.error) throw hiddenPending.error;
  assert.equal(hiddenPending.data.length, 0, "Pending tidak boleh tampil public.");
  expectError(await guest.from("invitation_wishes").select("id,status"), "Anonymous wish table read");
  expectError(await owner.client.from("invitation_wishes").select("id,status"), "Owner direct wish table read");
  expectError(await guest.rpc("list_public_approved_invitation_wishes", { p_invitation_id: invitation.id, p_limit: 11 }), "Anonymous direct public-list RPC");

  const moderationInvitation = await createInvitation(owner.client, `wishes-moderation-${randomUUID().slice(0, 8)}`);
  await setStatus(owner.client, moderationInvitation.id, "published");
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  for (let index = 0; index < ids.length; index += 1) {
    const result = await submit(admin, submission(moderationInvitation.id, {
      clientSubmissionId: ids[index],
      guestName: `Tamu Moderasi ${index + 1}`,
      message: `Ucapan moderasi nomor ${index + 1}.`,
      sourceHash: sourceHash(`moderation-${index}`),
    }));
    if (result.error) throw result.error;
  }
  const [wishOne, wishTwo] = await Promise.all([
    storedWish(admin, moderationInvitation.id, ids[0]),
    storedWish(admin, moderationInvitation.id, ids[1]),
  ]);
  expectError(await moderate(admin, attacker.id, moderationInvitation.id, wishOne, "approved"), "Unauthorized moderation", /wish_owner_access_denied/);
  expectError(await attacker.client.rpc("moderate_owned_invitation_wish", {
    p_owner_id: attacker.id, p_invitation_id: moderationInvitation.id, p_wish_id: wishOne.id,
    p_status: "approved", p_expected_updated_at: wishOne.updated_at,
  }), "Authenticated direct moderation RPC");

  const approved = await moderate(admin, owner.id, moderationInvitation.id, wishOne, "approved");
  if (approved.error) throw approved.error;
  const approvedList = await publicList(admin, moderationInvitation.id);
  if (approvedList.error) throw approvedList.error;
  assert.deepEqual(approvedList.data.map((row) => row.id), [wishOne.id], "Approve harus membuat wish tampil public.");
  assert.ok(!Object.hasOwn(approvedList.data[0], "status") && !Object.hasOwn(approvedList.data[0], "request_hash"), "Projection public tidak boleh memuat metadata moderation/anti-spam.");

  const approvedTwo = await moderate(admin, owner.id, moderationInvitation.id, wishTwo, "approved");
  if (approvedTwo.error) throw approvedTwo.error;
  const wishTwoApproved = { ...wishTwo, updated_at: first(approvedTwo.data).moderated_at };
  const rejectedTwo = await moderate(admin, owner.id, moderationInvitation.id, wishTwoApproved, "rejected");
  if (rejectedTwo.error) throw rejectedTwo.error;
  const afterReject = await publicList(admin, moderationInvitation.id);
  if (afterReject.error) throw afterReject.error;
  assert.deepEqual(afterReject.data.map((row) => row.id), [wishOne.id], "Reject harus menyembunyikan wish dari public.");

  const summary = await admin.rpc("get_owned_invitation_wish_summary", { p_owner_id: owner.id, p_invitation_id: moderationInvitation.id });
  if (summary.error) throw summary.error;
  assert.deepEqual(first(summary.data), { pending: 1, approved: 1, rejected: 1, total: 3 });
  for (const expectedStatus of ["pending", "approved", "rejected"]) {
    const list = await admin.rpc("list_owned_invitation_wishes", {
      p_owner_id: owner.id, p_invitation_id: moderationInvitation.id, p_status: expectedStatus, p_limit: 50, p_offset: 0,
    });
    if (list.error) throw list.error;
    assert.equal(list.data.length, 1);
    assert.equal(list.data[0].status, expectedStatus);
    assert.ok(!Object.hasOwn(list.data[0], "request_hash"));
  }
  expectError(await admin.rpc("get_owned_invitation_wish_summary", { p_owner_id: attacker.id, p_invitation_id: moderationInvitation.id }), "Unauthorized owner summary", /wish_owner_access_denied/);

  const concurrencyInvitation = await createInvitation(owner.client, `wishes-concurrency-${randomUUID().slice(0, 8)}`);
  await setStatus(owner.client, concurrencyInvitation.id, "published");
  const moderationId = randomUUID();
  const moderationSubmitted = await submit(admin, submission(concurrencyInvitation.id, { clientSubmissionId: moderationId }));
  if (moderationSubmitted.error) throw moderationSubmitted.error;
  const moderationWish = await storedWish(admin, concurrencyInvitation.id, moderationId);
  const concurrentModeration = await Promise.all([
    moderate(admin, owner.id, concurrencyInvitation.id, moderationWish, "approved"),
    moderate(admin, owner.id, concurrencyInvitation.id, moderationWish, "rejected"),
  ]);
  assert.equal(concurrentModeration.filter((result) => !result.error).length, 1, "Hanya satu keputusan concurrent boleh menang.");
  assert.equal(concurrentModeration.filter((result) => result.error?.message.includes("wish_moderation_conflict")).length, 1, "Keputusan stale harus conflict.");

  const rateInvitation = await createInvitation(owner.client, `wishes-rate-${randomUUID().slice(0, 8)}`);
  await setStatus(owner.client, rateInvitation.id, "published");
  const rateSource = sourceHash("wish-rate-limit");
  const rateResults = await Promise.all(Array.from({ length: 6 }, (_, index) => submit(admin, submission(rateInvitation.id, {
    guestName: `Rate Guest ${index}`,
    sourceHash: rateSource,
  }))));
  assert.equal(rateResults.filter((result) => !result.error).length, 5, "Batas sumber harus menerima tepat lima submission.");
  assert.equal(rateResults.filter((result) => result.error?.message.includes("wish_rate_limited")).length, 1, "Submission keenam harus rate limited secara atomik.");

  await setStatus(owner.client, rateInvitation.id, "inactive");
  expectError(await submit(admin, submission(rateInvitation.id)), "Unpublished submission", /wish_invitation_not_available/);

  console.log(JSON.stringify({
    invitationId: invitation.id,
    moderationInvitationId: moderationInvitation.id,
    rateLimit: { source: "5 per 10 minutes", invitation: "100 per 10 minutes" },
    validated: [
      "published submit and draft/unpublished rejection", "validation and normalization", "pending by default",
      "idempotent and concurrent submission", "atomic source rate limit", "RLS and narrow service-role RPC",
      "approved-only cursor public projection", "approve/reject visibility", "owner status filters and summary",
      "unauthorized moderation rejection", "optimistic concurrent moderation conflict",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
