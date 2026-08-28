import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "../../supabase/migrations/202608280003_daztore_rsvp.sql"), "utf8");

describe("RSVP persistence security migration", () => {
  it("uses a dedicated constrained table and efficient owner indexes", () => {
    expect(migration).toMatch(/create table public\.invitation_rsvps/);
    expect(migration).toMatch(/unique \(invitation_id, client_submission_id\)/);
    expect(migration).toMatch(/attendance_status in \('attending','not_attending'\)/);
    expect(migration).toMatch(/guest_count between 1 and 10/);
    expect(migration).toMatch(/invitation_rsvps_invitation_created_idx/);
    expect(migration).not.toMatch(/jsonb/i);
  });

  it("keeps tables and narrow RPCs closed to anonymous and authenticated clients", () => {
    expect(migration).toMatch(/alter table public\.invitation_rsvps enable row level security/);
    expect(migration).toMatch(/revoke all on public\.invitation_rsvps from public, anon, authenticated/);
    expect(migration).toMatch(/grant execute on function public\.submit_public_invitation_rsvp[\s\S]*to service_role/);
    expect(migration).not.toMatch(/grant execute on function public\.submit_public_invitation_rsvp[^;]+to (anon|authenticated)/);
  });

  it("enforces publication, active owner, idempotency, atomic rate limits, and owner-only reads", () => {
    expect(migration).toMatch(/i\.status = 'published'[\s\S]*p\.status = 'active'/);
    expect(migration).toMatch(/rsvp_idempotency_conflict|rsvp_rate_limited/);
    expect(migration).toMatch(/5, interval '10 minutes'/);
    expect(migration).toMatch(/100, interval '10 minutes'/);
    expect(migration).toMatch(/rsvp_owner_access_denied/);
  });
});
