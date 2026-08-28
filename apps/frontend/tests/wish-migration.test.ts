import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(process.cwd(), "../../supabase/migrations/202608290001_daztore_wishes.sql"), "utf8");

describe("Wishes persistence and moderation migration", () => {
  it("uses a dedicated constrained table with pending default and efficient status ordering", () => {
    expect(migration).toMatch(/create table public\.invitation_wishes/);
    expect(migration).toMatch(/unique \(invitation_id, client_submission_id\)/);
    expect(migration).toMatch(/default 'pending'.*status in \('pending','approved','rejected'\)/);
    expect(migration).toMatch(/invitation_wishes_invitation_status_created_idx/);
    expect(migration).not.toMatch(/jsonb/i);
  });

  it("keeps tables and all narrow RPCs closed to browser roles", () => {
    expect(migration).toMatch(/alter table public\.invitation_wishes enable row level security/);
    expect(migration).toMatch(/revoke all on public\.invitation_wishes from public, anon, authenticated/);
    expect(migration).toMatch(/grant execute on function public\.submit_public_invitation_wish[\s\S]*to service_role/);
    expect(migration).not.toMatch(/grant execute on function public\.(submit_public_invitation_wish|list_public_approved_invitation_wishes|moderate_owned_invitation_wish)[^;]+to (anon|authenticated)/);
  });

  it("enforces publication, idempotency, atomic rate limits, approved-only reads, and locked moderation", () => {
    expect(migration).toMatch(/i\.status = 'published'[\s\S]*p\.status = 'active'/);
    expect(migration).toMatch(/wish_idempotency_conflict|wish_rate_limited/);
    expect(migration).toMatch(/5, interval '10 minutes'/);
    expect(migration).toMatch(/100, interval '10 minutes'/);
    expect(migration).toMatch(/w\.status = 'approved'/);
    expect(migration).toMatch(/for update of w/);
    expect(migration).toMatch(/wish_moderation_conflict/);
  });
});
