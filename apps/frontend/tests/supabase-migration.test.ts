import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { templateRegistry } from "@/templates/registry";
import { themeRegistry } from "@/themes/registry";

const sql = readFileSync(join(process.cwd(), "../../supabase/migrations/202608240001_initial_architecture.sql"), "utf8");

describe("Supabase migration security and integrity", () => {
  it("defines all required tables, JSON object constraint, and focused indexes", () => {
    for (const table of ["profiles", "invitation_routes", "template_catalog", "theme_catalog", "invitations", "invitation_media"]) expect(sql).toContain(`create table public.${table}`);
    expect(sql).toMatch(/content jsonb not null check \(jsonb_typeof\(content\) = 'object'\)/);
    expect(sql).not.toMatch(/using gin/i);
  });

  it("enforces owner consistency, route uniqueness, quota locking, and atomic claims", () => {
    expect(sql).toMatch(/foreign key \(route_id, owner_id\)/);
    expect(sql).toMatch(/unique \(route_id\)/);
    expect(sql).toMatch(/for update;/i);
    expect(sql).toMatch(/route_quota_exceeded/);
    expect(sql).toMatch(/create function public\.claim_route_and_create_invitation/);
    expect(sql).toMatch(/invitation_routes_slug_unique/);
  });

  it("uses RLS and a narrow published-only guest function without anonymous invitation SELECT", () => {
    for (const table of ["profiles", "invitation_routes", "template_catalog", "theme_catalog", "invitations", "invitation_media"]) expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).toMatch(/get_published_invitation_by_slug[\s\S]*i\.status = 'published'/);
    expect(sql).not.toMatch(/policy .* on public\.invitations for select to anon/i);
    expect(sql).toMatch(/policy invitations_read_owner[\s\S]*using \(owner_id = auth\.uid\(\)\)/);
    expect(sql).not.toMatch(/policy invitations_read[^\n]*is_admin/);
    expect(sql).toMatch(/set search_path = ''/);
  });

  it("seeds catalog keys in parity with the frontend registries", () => {
    for (const templateModule of Object.values(templateRegistry)) {
      const manifest = templateModule.manifest;
      expect(sql).toContain(`('${manifest.key}',${manifest.version},'${manifest.name}'`);
      expect(sql).toContain(`'${manifest.thumbnail}',${templateModule.activeContentSchemaVersion},'${JSON.stringify(manifest.supportedSections)}')`);
    }
    for (const theme of themeRegistry) {
      expect(sql).toContain(`('${theme.key}',${theme.version},'${theme.templateKey}',${theme.templateVersion},'${theme.name}'`);
      expect(sql).toContain(`'${JSON.stringify(theme.tokens)}')`);
    }
  });

  it("keeps Storage private and scoped by owner/invitation folders", () => {
    expect(sql).toMatch(/'invitation-media', 'invitation-media', false/);
    expect(sql).toMatch(/storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
    expect(sql).toMatch(/storage\.foldername\(name\)\)\[2\]/);
  });
});
