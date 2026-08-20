import { beforeEach, describe, expect, it } from "vitest";
import { createDemoRuntime } from "@/lib/demo-runtime";
import { STORAGE_KEYS } from "@/repositories/mock";

const minimal = {
  title: "Undangan Test", templateKey: "minimal-white", templateVersion: 1,
  themeKey: "minimal-white-default", themeVersion: 1,
};

describe("route allocation and invitation ownership", () => {
  beforeEach(() => localStorage.clear());

  it("lists only invitations and routes owned by the current user", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    expect(runtime.invitationService.listOwned(user).every((item) => item.ownerId === user.userId)).toBe(true);
    expect(runtime.routeService.listOwned(user).every((item) => item.route.ownerId === user.userId)).toBe(true);
  });
  it("rejects foreign-owner invitation edits for user and admin", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    expect(() => runtime.invitationService.update(user, { ...runtime.invitations.findById("inv_admin_published")!, title: "Tidak boleh" })).toThrow("bukan milik");
    runtime.auth.logout(); const admin = runtime.auth.login("admin@demo.local", "admin-demo");
    expect(() => runtime.invitationService.update(admin, { ...runtime.invitations.findById("inv_owner_draft")!, title: "Tidak boleh" })).toThrow("bukan milik");
  });
  it("lets admin preassign a unique route while capacity remains", () => {
    const runtime = createDemoRuntime(localStorage); const admin = runtime.auth.login("admin@demo.local", "admin-demo");
    const route = runtime.routeService.preassign(admin, "usr_owner_demo", "Route Baru Demo");
    expect(route).toMatchObject({ ownerId: "usr_owner_demo", slug: "route-baru-demo", assignedBy: "admin" });
    expect(() => runtime.routeService.preassign(admin, "usr_admin_demo", "route-baru-demo")).toThrow("sudah digunakan");
  });
  it("lets a user use an unused preassigned route", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    const created = runtime.invitationService.create(user, { ...minimal, route: { mode: "existing", routeId: "route_owner_available" } });
    expect(created.routeId).toBe("route_owner_available");
    expect(runtime.routes.findById(created.routeId)?.slug).toBe("route-raka-tersedia");
  });
  it("lets a user claim a new route while capacity remains", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    const created = runtime.invitationService.create(user, { ...minimal, route: { mode: "new", slug: "Demo Slice 2026" } });
    expect(runtime.routes.findById(created.routeId)).toMatchObject({ slug: "demo-slice-2026", assignedBy: "user" });
  });
  it("rolls back a newly claimed route when invitation persistence fails", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    runtime.invitations.create = () => { throw new Error("Simulasi gagal simpan undangan"); };
    expect(() => runtime.invitationService.create(user, { ...minimal, route: { mode: "new", slug: "harus-di-rollback" } })).toThrow("Simulasi gagal");
    expect(runtime.routes.findBySlug("harus-di-rollback")).toBeNull();
  });
  it("enforces route quota in the service layer", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    runtime.invitationService.create(user, { ...minimal, route: { mode: "new", slug: "kapasitas-terakhir" } });
    expect(() => runtime.invitationService.create(user, { ...minimal, route: { mode: "new", slug: "melewati-kuota" } })).toThrow("Kuota route sudah penuh");
  });
  it("rejects duplicate, reserved, and ampersand slugs", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    expect(() => runtime.invitationService.create(user, { ...minimal, route: { mode: "new", slug: "dara-dan-bima" } })).toThrow("sudah digunakan");
    expect(() => runtime.invitationService.create(user, { ...minimal, route: { mode: "new", slug: "admin" } })).toThrow("dicadangkan");
    expect(() => runtime.invitationService.create(user, { ...minimal, route: { mode: "new", slug: "nara & bima" } })).toThrow("karakter &");
  });
  it("does not let a user change an assigned route", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    const owned = runtime.invitationService.getOwned(user, "inv_owner_draft");
    expect(() => runtime.invitationService.update(user, { ...owned, routeId: "route_owner_available" })).toThrow("tidak dapat diubah oleh user");
    expect(() => runtime.routeService.reassign(user, owned.routeId, "user-mencoba")).toThrow("hanya dapat dilakukan admin");
  });
  it("lets admin reassign a route while preserving invitation content, template, theme, and status", () => {
    const runtime = createDemoRuntime(localStorage); const before = structuredClone(runtime.invitations.findById("inv_admin_published")!);
    const admin = runtime.auth.login("admin@demo.local", "admin-demo");
    runtime.routeService.reassign(admin, before.routeId, "dara-bima-baru");
    expect(runtime.routes.findBySlug("dara-dan-bima")).toBeNull();
    expect(runtime.routes.findBySlug("dara-bima-baru")?.id).toBe(before.routeId);
    expect(runtime.invitations.findById(before.id)).toEqual(before);
  });
  it("prevents one route from being used by multiple invitations", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    runtime.invitationService.create(user, { ...minimal, route: { mode: "existing", routeId: "route_owner_available" } });
    expect(() => runtime.invitationService.create(user, { ...minimal, route: { mode: "existing", routeId: "route_owner_available" } })).toThrow("sudah digunakan");
  });
  it("changes theme without changing content, route, or template", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    const before = runtime.invitationService.getOwned(user, "inv_owner_draft");
    const changed = runtime.invitationService.update(user, { ...before, themeKey: "minimal-white-sage" });
    expect(changed).toMatchObject({ routeId: before.routeId, templateKey: before.templateKey, content: before.content, themeKey: "minimal-white-sage" });
  });
  it("selects the target template default theme and preserves content when template changes", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    const before = runtime.invitationService.getOwned(user, "inv_owner_draft");
    const changed = runtime.invitationService.update(user, { ...before, templateKey: "elegant-gold", themeKey: "minimal-white-sage" });
    expect(changed).toMatchObject({ templateKey: "elegant-gold", themeKey: "elegant-gold-default", routeId: before.routeId, content: before.content });
  });
  it("rejects invalid template-theme combinations", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    expect(() => runtime.invitationService.create(user, { ...minimal, themeKey: "elegant-gold-default", route: { mode: "existing", routeId: "route_owner_available" } })).toThrow("tidak kompatibel");
  });
  it("rejects inactive templates and themes on update or publish", () => {
    const runtime = createDemoRuntime(localStorage); const user = runtime.auth.login("user@demo.local", "user-demo");
    const owned = runtime.invitationService.getOwned(user, "inv_owner_draft");
    const themes = runtime.themes.list().map((theme) => theme.key === owned.themeKey ? { ...theme, status: "inactive" as const } : theme);
    localStorage.setItem(STORAGE_KEYS.themes, JSON.stringify(themes));
    expect(() => runtime.invitationService.update(user, owned)).toThrow("Tema tidak tersedia");
    expect(() => runtime.invitationService.publish(user, owned.id)).toThrow("Tema tidak tersedia");
  });
});

describe("route-based publication", () => {
  beforeEach(() => localStorage.clear());
  it("resolves a route to a published invitation and rejects draft, empty, and missing routes", () => {
    const runtime = createDemoRuntime(localStorage);
    expect(runtime.invitationService.findPublished("dara-dan-bima")?.id).toBe("inv_admin_published");
    expect(runtime.invitationService.findPublished("raka-dan-sinta-draft")).toBeNull();
    expect(runtime.invitationService.findPublished("route-raka-tersedia")).toBeNull();
    expect(runtime.invitationService.findPublished("missing-route")).toBeNull();
  });
  it("moves a published invitation through inactive and back to public", () => {
    const runtime = createDemoRuntime(localStorage); const admin = runtime.auth.login("admin@demo.local", "admin-demo");
    expect(runtime.invitationService.unpublish(admin, "inv_admin_published").status).toBe("inactive");
    expect(runtime.invitationService.findPublished("dara-dan-bima")).toBeNull();
    runtime.invitationService.publish(admin, "inv_admin_published");
    expect(runtime.invitationService.findPublished("dara-dan-bima")).not.toBeNull();
  });
  it("still allows admin to use owner features only for admin-owned invitations", () => {
    const runtime = createDemoRuntime(localStorage); const admin = runtime.auth.login("admin@demo.local", "admin-demo");
    const owned = runtime.invitationService.getOwned(admin, "inv_admin_published");
    expect(runtime.invitationService.update(admin, { ...owned, title: "Admin Edit" }).title).toBe("Admin Edit");
  });
});
