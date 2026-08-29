import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

function localStatus() {
  const output = execFileSync("supabase", ["status", "--workdir", "../..", "-o", "json"], {
    cwd: new URL("..", import.meta.url), encoding: "utf8", shell: process.platform === "win32",
  });
  const status = JSON.parse(output.slice(output.indexOf("{")));
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname), "RSVP integration hanya boleh memakai Supabase lokal.");
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
    p_title: "RSVP integration",
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

async function publish(owner, invitationId) {
  const result = await owner.from("invitations").update({ status: "published" }).eq("id", invitationId).select("id,status,published_at").single();
  if (result.error) throw result.error;
  assert.equal(result.data.status, "published");
  assert.ok(result.data.published_at);
}

function submission(invitationId, overrides = {}) {
  return {
    p_invitation_id: invitationId,
    p_client_submission_id: overrides.clientSubmissionId ?? randomUUID(),
    p_guest_name: overrides.guestName ?? "Tamu Undangan",
    p_attendance_status: overrides.status ?? "attending",
    p_guest_count: overrides.guestCount ?? 2,
    p_note: overrides.note ?? "Sampai bertemu di acara.",
    p_source_hash: overrides.sourceHash ?? sourceHash(randomUUID()),
  };
}

async function submit(admin, payload) {
  return admin.rpc("submit_public_invitation_rsvp", payload);
}

async function main() {
  const status = localStatus();
  const admin = client(status.API_URL, status.SERVICE_ROLE_KEY);
  const guest = client(status.API_URL, status.ANON_KEY);
  const owner = await createUser(admin, status, "rsvp-owner");
  const attacker = await createUser(admin, status, "rsvp-attacker");
  const routeQuota = await admin.from("profiles").update({ route_quota: 3 }).eq("id", owner.id);
  if (routeQuota.error) throw routeQuota.error;

  const invitation = await createInvitation(owner.client, `rsvp-${randomUUID().slice(0, 8)}`);
  const draftPayload = submission(invitation.id);
  expectError(await submit(admin, draftPayload), "Draft submission", /rsvp_invitation_not_available/);
  expectError(await guest.rpc("submit_public_invitation_rsvp", draftPayload), "Anonymous direct RPC");
  expectError(await owner.client.rpc("submit_public_invitation_rsvp", draftPayload), "Authenticated direct RPC");

  await publish(owner.client, invitation.id);
  expectError(await submit(admin, submission(invitation.id, { guestName: "A" })), "Nama terlalu pendek", /invalid_rsvp_submission/);
  expectError(await submit(admin, submission(invitation.id, { status: "attending", guestCount: 0 })), "Jumlah hadir invalid", /invalid_rsvp_submission/);
  expectError(await submit(admin, submission(invitation.id, { status: "not_attending", guestCount: 1 })), "Jumlah tidak hadir invalid", /invalid_rsvp_submission/);
  expectError(await submit(admin, submission(invitation.id, { note: "x".repeat(501) })), "Catatan terlalu panjang", /invalid_rsvp_submission/);

  const idempotentId = randomUUID();
  const normalizedPayload = submission(invitation.id, { clientSubmissionId: idempotentId, guestName: "  Tamu   Satu  ", note: "  Hadir   bersama keluarga.  ", sourceHash: sourceHash("idempotent-source") });
  const accepted = await submit(admin, normalizedPayload);
  if (accepted.error) throw accepted.error;
  assert.equal(first(accepted.data).idempotent, false);
  const repeated = await submit(admin, normalizedPayload);
  if (repeated.error) throw repeated.error;
  assert.equal(first(repeated.data).rsvp_id, first(accepted.data).rsvp_id);
  assert.equal(first(repeated.data).idempotent, true);
  expectError(await submit(admin, { ...normalizedPayload, p_note: "Payload berubah" }), "Idempotency conflict", /rsvp_idempotency_conflict/);

  const concurrentId = randomUUID();
  const concurrentPayload = submission(invitation.id, { clientSubmissionId: concurrentId, sourceHash: sourceHash("concurrent-idempotency") });
  const concurrentSame = await Promise.all([submit(admin, concurrentPayload), submit(admin, concurrentPayload)]);
  for (const result of concurrentSame) if (result.error) throw result.error;
  assert.equal(new Set(concurrentSame.map((result) => first(result.data).rsvp_id)).size, 1, "Concurrent retry harus converge ke satu row.");

  const rateSource = sourceHash("rate-limit-source");
  const rateResults = await Promise.all(Array.from({ length: 6 }, (_, index) => submit(admin, submission(invitation.id, {
    guestName: `Rate Guest ${index}`,
    sourceHash: rateSource,
  }))));
  assert.equal(rateResults.filter((result) => !result.error).length, 5, "Batas sumber harus menerima tepat lima submission per window.");
  assert.equal(rateResults.filter((result) => result.error?.message.includes("rsvp_rate_limited")).length, 1, "Submission keenam harus rate limited secara atomik.");

  const stored = await admin.from("invitation_rsvps").select("guest_name,note").eq("invitation_id", invitation.id).eq("client_submission_id", idempotentId).single();
  if (stored.error) throw stored.error;
  assert.deepEqual(stored.data, { guest_name: "Tamu Satu", note: "Hadir bersama keluarga." });
  expectError(await guest.from("invitation_rsvps").select("id"), "Anonymous RSVP table read");
  expectError(await owner.client.from("invitation_rsvps").select("id"), "Owner direct RSVP table read");

  const summaryInvitation = await createInvitation(owner.client, `rsvp-summary-${randomUUID().slice(0, 8)}`);
  await publish(owner.client, summaryInvitation.id);
  const summaryPayloads = [
    submission(summaryInvitation.id, { guestName: "Hadir Dua", guestCount: 2, sourceHash: sourceHash("summary-1") }),
    submission(summaryInvitation.id, { guestName: "Hadir Tiga", guestCount: 3, sourceHash: sourceHash("summary-2") }),
    submission(summaryInvitation.id, { guestName: "Tidak Hadir", status: "not_attending", guestCount: 0, sourceHash: sourceHash("summary-3") }),
  ];
  for (const payload of summaryPayloads) {
    const result = await submit(admin, payload);
    if (result.error) throw result.error;
  }
  const summary = await admin.rpc("get_owned_invitation_rsvp_summary", { p_owner_id: owner.id, p_invitation_id: summaryInvitation.id });
  if (summary.error) throw summary.error;
  assert.deepEqual(first(summary.data), { attending: 2, not_attending: 1, attending_guest_count: 5, total_responses: 3 });
  const list = await admin.rpc("list_owned_invitation_rsvps", { p_owner_id: owner.id, p_invitation_id: summaryInvitation.id, p_limit: 100, p_offset: 0 });
  if (list.error) throw list.error;
  assert.equal(list.data.length, 3);
  assert.ok(!Object.hasOwn(list.data[0], "request_hash") && !Object.hasOwn(list.data[0], "source_hash"), "Owner projection tidak boleh mengekspos internal anti-spam metadata.");
  expectError(await admin.rpc("get_owned_invitation_rsvp_summary", { p_owner_id: attacker.id, p_invitation_id: summaryInvitation.id }), "Unauthorized owner summary", /rsvp_owner_access_denied/);
  expectError(await attacker.client.rpc("list_owned_invitation_rsvps", { p_owner_id: attacker.id, p_invitation_id: summaryInvitation.id, p_limit: 100, p_offset: 0 }), "Authenticated direct owner RPC");

  const inactive = await admin.from("profiles").update({ status: "inactive" }).eq("id", owner.id);
  if (inactive.error) throw inactive.error;
  expectError(await submit(admin, submission(summaryInvitation.id)), "Inactive owner invitation", /rsvp_invitation_not_available/);

  console.log(JSON.stringify({
    invitationId: invitation.id,
    summaryInvitationId: summaryInvitation.id,
    rateLimit: { source: "5 per 10 minutes", invitation: "100 per 10 minutes" },
    validated: [
      "published active invitation submit", "draft and inactive rejection", "server constraints and normalization",
      "idempotent retry and conflict", "concurrent duplicate convergence", "atomic source rate limit",
      "anonymous/authenticated direct RPC rejection", "RSVP table RLS/grants", "owner-only list and summary",
    ],
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
