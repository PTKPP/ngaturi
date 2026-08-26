import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApplicationRepository } from "@/repositories/contracts";
import type { Invitation } from "@/domain";
import { mapInvitation, mapProfile, mapRoute, mapTemplate, mapTheme } from "./mappers";

const invitationColumns = "id,owner_id,route_id,title,category_key,category_version,template_key,template_version,content_schema_version,theme_key,theme_version,theme_overrides,status,content,published_at,created_at,updated_at";

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message ?? fallback);
}

export class SupabaseApplicationRepository implements ApplicationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listProfiles() {
    const { data, error } = await this.client.from("profiles").select("id,name,email,role,status,route_quota,created_at,updated_at").order("created_at");
    if (error) fail(error, "Profil gagal dimuat.");
    return (data ?? []).map(mapProfile);
  }
  async listOwnedRoutes(ownerId: string) {
    const { data, error } = await this.client.from("invitation_routes").select("id,owner_id,slug,assigned_by,created_at,updated_at,invitations(id)").eq("owner_id", ownerId).order("created_at");
    if (error) fail(error, "Route gagal dimuat.");
    return (data ?? []).map((row) => ({ route: mapRoute(row), invitationId: Array.isArray(row.invitations) ? String(row.invitations[0]?.id ?? "") || null : null }));
  }
  async routeUsage(owner: { id: string; routeQuota: number }) {
    const { count, error } = await this.client.from("invitation_routes").select("id", { count: "exact", head: true }).eq("owner_id", owner.id);
    if (error) fail(error, "Kuota route gagal dimuat.");
    const used = count ?? 0;
    return { used, quota: owner.routeQuota, remaining: Math.max(0, owner.routeQuota - used) };
  }
  async listOwnedInvitations(ownerId: string) {
    const { data, error } = await this.client.from("invitations").select(invitationColumns).eq("owner_id", ownerId).order("updated_at", { ascending: false });
    if (error) fail(error, "Undangan gagal dimuat.");
    return (data ?? []).map(mapInvitation);
  }
  async findOwnedInvitation(ownerId: string, id: string) {
    const { data, error } = await this.client.from("invitations").select(invitationColumns).eq("id", id).eq("owner_id", ownerId).maybeSingle();
    if (error) fail(error, "Undangan gagal dimuat.");
    return data ? mapInvitation(data) : null;
  }
  async findPublishedInvitation(slug: string) {
    const { data, error } = await this.client.rpc("get_published_invitation_by_slug", { p_slug: slug });
    if (error) fail(error, "Undangan publik gagal dimuat.");
    const result = data as { invitation?: Record<string, unknown> } | null;
    if (!result?.invitation) return null;
    const row = result.invitation;
    return mapInvitation({ id: row.id, owner_id: row.ownerId, route_id: row.routeId, title: row.title, category_key: row.categoryKey, category_version: row.categoryVersion, template_key: row.templateKey, template_version: row.templateVersion, content_schema_version: row.contentSchemaVersion, theme_key: row.themeKey, theme_version: row.themeVersion, theme_overrides: row.themeOverrides, status: row.status, content: row.content, published_at: row.publishedAt, created_at: row.createdAt, updated_at: row.updatedAt });
  }
  async listTemplates() {
    const { data, error } = await this.client.from("template_catalog").select("key,version,name,description,thumbnail,status,category_key,category_version,active_content_schema_version,theme_schema_version,supported_modules,required_modules,optional_modules,default_enabled_modules,sections,supported_sections").eq("status", "active").order("key");
    if (error) fail(error, "Template gagal dimuat.");
    return (data ?? []).map(mapTemplate);
  }
  async listThemes() {
    const { data, error } = await this.client.from("theme_catalog").select("key,version,template_key,template_version,name,description,status,is_default,tokens").eq("status", "active").order("key");
    if (error) fail(error, "Tema gagal dimuat.");
    return (data ?? []).map(mapTheme);
  }
  async createInvitation(_ownerId: string, input: { routeId?: string; slug?: string; title: string; categoryKey: string; categoryVersion: number; templateKey: string; templateVersion: number; contentSchemaVersion: number; themeKey: string; themeVersion: number; themeOverrides: Record<string, unknown>; content: Record<string, unknown> }) {
    const parameters = { p_title: input.title, p_template_key: input.templateKey, p_template_version: input.templateVersion, p_content_schema_version: input.contentSchemaVersion, p_theme_key: input.themeKey, p_theme_version: input.themeVersion, p_content: input.content };
    const response = input.routeId
      ? await this.client.rpc("create_invitation_on_route", { ...parameters, p_route_id: input.routeId })
      : await this.client.rpc("claim_route_and_create_invitation", { ...parameters, p_slug: input.slug });
    if (response.error) fail(response.error, "Undangan gagal dibuat.");
    return mapInvitation(response.data as Record<string, unknown>);
  }
  async updateInvitation(ownerId: string, invitation: Invitation) {
    const { data, error } = await this.client.from("invitations").update({ title: invitation.title, category_key: invitation.categoryKey, category_version: invitation.categoryVersion, template_key: invitation.templateKey, template_version: invitation.templateVersion, content_schema_version: invitation.contentSchemaVersion, theme_key: invitation.themeKey, theme_version: invitation.themeVersion, theme_overrides: invitation.themeOverrides, status: invitation.status, content: invitation.content, published_at: invitation.publishedAt }).eq("id", invitation.id).eq("owner_id", ownerId).select(invitationColumns).single();
    if (error) fail(error, "Undangan gagal disimpan.");
    return mapInvitation(data);
  }
  async preassignRoute(ownerId: string, slug: string) { const { data, error } = await this.client.rpc("admin_preassign_route", { p_owner_id: ownerId, p_slug: slug }); if (error) fail(error, "Route gagal dialokasikan."); return mapRoute(data as Record<string, unknown>); }
  async reassignRoute(routeId: string, slug: string, confirmed: boolean) { const { data, error } = await this.client.rpc("admin_reassign_route", { p_route_id: routeId, p_slug: slug, p_confirm: confirmed }); if (error) fail(error, "Route gagal diganti."); return mapRoute(data as Record<string, unknown>); }
  async setRouteQuota(ownerId: string, quota: number) { const { data, error } = await this.client.rpc("admin_set_route_quota", { p_owner_id: ownerId, p_quota: quota }); if (error) fail(error, "Kuota gagal diubah."); return mapProfile(data as Record<string, unknown>); }
}
