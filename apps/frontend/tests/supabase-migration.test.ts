import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { templateRegistry } from "@/templates/registry";
import { themeRegistry } from "@/themes/registry";
import { categoryRegistry } from "@/invitation-categories/registry";

const initialSql = readFileSync(join(process.cwd(), "../../supabase/migrations/202608240001_initial_architecture.sql"), "utf8");
const architectureSql = readFileSync(join(process.cwd(), "../../supabase/migrations/202608260001_category_module_architecture.sql"), "utf8");
const compositionSql = readFileSync(join(process.cwd(), "../../supabase/migrations/202608270001_daztore_music_composition.sql"), "utf8");
const sql = `${initialSql}\n${architectureSql}\n${compositionSql}`;

describe("Supabase migration security and integrity", () => {
  it("defines all required tables, JSON object constraint, and focused indexes", () => {
    for (const table of ["profiles", "invitation_routes", "category_catalog", "template_catalog", "theme_catalog", "invitations", "invitation_media"]) expect(sql).toContain(`create table public.${table}`);
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
    for (const table of ["profiles", "invitation_routes", "category_catalog", "template_catalog", "theme_catalog", "invitations", "invitation_media"]) expect(sql).toContain(`alter table public.${table} enable row level security`);
    expect(sql).toMatch(/get_published_invitation_by_slug[\s\S]*i\.status = 'published'/);
    expect(sql).not.toMatch(/policy .* on public\.invitations for select to anon/i);
    expect(sql).toMatch(/policy invitations_read_owner[\s\S]*using \(owner_id = auth\.uid\(\)\)/);
    expect(sql).not.toMatch(/policy invitations_read[^\n]*is_admin/);
    expect(sql).toMatch(/set search_path = ''/);
  });

  it("seeds catalog keys in parity with the frontend registries", () => {
    for (const category of categoryRegistry) {
      const initialCapabilities = Object.fromEntries(Object.entries(category.capabilities).filter(([key]) => key !== "music"));
      expect(architectureSql).toContain(`('${category.key}',${category.version},'${category.name}','${JSON.stringify(category.requiredModules)}','${JSON.stringify(initialCapabilities)}')`);
    }
    expect(compositionSql).toMatch(/jsonb_set\(\s*capabilities,\s*'\{music\}',[\s\S]*?true\s*\)/);
    expect(compositionSql).toContain("key = 'wedding' then '\"default\"'::jsonb else '\"optional\"'::jsonb");
    for (const templateModule of Object.values(templateRegistry)) {
      const manifest = templateModule.manifest;
      expect(sql).toContain(`('${manifest.key}',${manifest.version},'${manifest.name}'`);
      expect(initialSql).toContain(`('${manifest.key}',${manifest.version},'${manifest.name}'`);
      expect(architectureSql).toContain(`active_content_schema_version = 2`);
      expect(sql).toContain(JSON.stringify(manifest.sections));
      expect(sql).toContain(JSON.stringify(manifest.supportedModules));
      expect(sql).toContain(JSON.stringify(manifest.requiredModules));
      expect(sql).toContain(JSON.stringify(manifest.optionalModules));
      expect(sql).toContain(JSON.stringify(manifest.defaultEnabledModules));
    }
    for (const theme of themeRegistry) {
      expect(initialSql).toContain(`('${theme.key}',${theme.version},'${theme.templateKey}',${theme.templateVersion},'${theme.name}'`);
      expect(architectureSql).toContain(`when '${theme.key}'`);
    }
    expect(architectureSql).toContain('"headingFont"');
    expect(architectureSql).toContain("invitation_theme_override_keys_safe");
    expect(architectureSql).toContain("invitation_category_immutable");
  });

  it("backfills before constraints and keeps legacy rows readable without weakening category integrity", () => {
    expect(architectureSql.indexOf("update public.invitations i set category_key")).toBeLessThan(architectureSql.indexOf("alter table public.invitations\n  alter column category_key set not null"));
    expect(architectureSql).toMatch(/template_catalog_category_unique unique \(key, version, category_key, category_version\)/);
    expect(architectureSql).toMatch(/invitations_template_category_fk foreign key \(template_key, template_version, category_key, category_version\)/);
    expect(architectureSql).toMatch(/if tg_op = 'INSERT' or new\.content is distinct from old\.content/);
    expect(architectureSql).toContain("invitation_category_immutable");
    expect(architectureSql).toContain("new.status = 'published' and old.status <> 'published'");
  });

  it("keeps Storage private and scoped by owner/invitation folders", () => {
    expect(sql).toMatch(/'invitation-media', 'invitation-media', false/);
    expect(sql).toMatch(/storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
    expect(sql).toMatch(/storage\.foldername\(name\)\)\[2\]/);
  });
});
