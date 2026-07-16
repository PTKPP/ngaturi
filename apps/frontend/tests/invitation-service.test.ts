import { beforeEach, describe, expect, it } from "vitest";
import { createDemoRuntime } from "@/lib/demo-runtime";

describe("invitation ownership and publication", () => {
  beforeEach(() => localStorage.clear());

  it("lists only invitations owned by the current user", () => {
    const runtime = createDemoRuntime(localStorage);
    const user = runtime.auth.login("user@demo.local", "user-demo");
    expect(runtime.invitationService.listOwned(user).every((item) => item.ownerId === user.userId)).toBe(true);
  });
  it("rejects foreign-owner edits for user and admin", () => {
    const runtime = createDemoRuntime(localStorage);
    const user = runtime.auth.login("user@demo.local", "user-demo");
    const adminInvitation = runtime.invitations.findById("inv_admin_published");
    expect(adminInvitation).not.toBeNull();
    expect(() => runtime.invitationService.update(user, { ...adminInvitation!, title: "Tidak boleh" })).toThrow("bukan milik");
    runtime.auth.logout();
    const admin = runtime.auth.login("admin@demo.local", "admin-demo");
    const userInvitation = runtime.invitations.findById("inv_owner_draft");
    expect(() => runtime.invitationService.update(admin, { ...userInvitation!, title: "Tidak boleh" })).toThrow("bukan milik");
  });
  it("finds only published invitations through public lookup", () => {
    const runtime = createDemoRuntime(localStorage);
    expect(runtime.invitationService.findPublished("dara-dan-bima")?.status).toBe("published");
    expect(runtime.invitationService.findPublished("raka-dan-sinta-draft")).toBeNull();
  });
  it("rejects duplicate and reserved slugs", () => {
    const runtime = createDemoRuntime(localStorage);
    const user = runtime.auth.login("user@demo.local", "user-demo");
    expect(() => runtime.invitationService.create(user, { title: "Duplikat", slug: "dara-dan-bima", templateKey: "minimal-white", templateVersion: 1 })).toThrow("sudah digunakan");
    expect(() => runtime.invitationService.create(user, { title: "Reserved", slug: "admin", templateKey: "minimal-white", templateVersion: 1 })).toThrow("dicadangkan");
    expect(() => runtime.invitationService.create(user, { title: "Ampersand", slug: "nara & bima", templateKey: "minimal-white", templateVersion: 1 })).toThrow("karakter &");
    expect(() => runtime.invitationService.create(user, { title: "Internal", slug: "_next", templateKey: "minimal-white", templateVersion: 1 })).toThrow("dicadangkan");
    expect(() => runtime.invitationService.create(user, { title: "Icon", slug: "favicon.ico", templateKey: "minimal-white", templateVersion: 1 })).toThrow("dicadangkan");
  });
  it("runs the login-create-edit-template-publish-public vertical slice", () => {
    const runtime = createDemoRuntime(localStorage);
    const user = runtime.auth.login("user@demo.local", "user-demo");
    const created = runtime.invitationService.create(user, { title: "Demo Slice", slug: "demo slice 2026", templateKey: "elegant-gold", templateVersion: 1 });
    const edited = runtime.invitationService.update(user, { ...created, templateKey: "minimal-white", couple: { ...created.couple, partnerOne: { ...created.couple.partnerOne, fullName: "Nara Demo" } } });
    expect(edited.slug).toBe("demo-slice-2026");
    runtime.invitationService.publish(user, edited.id);
    expect(runtime.invitationService.findPublished("demo-slice-2026")?.couple.partnerOne.fullName).toBe("Nara Demo");
  });
  it("allows admin to use owner invitation features", () => {
    const runtime = createDemoRuntime(localStorage);
    const admin = runtime.auth.login("admin@demo.local", "admin-demo");
    const owned = runtime.invitationService.getOwned(admin, "inv_admin_published");
    expect(runtime.invitationService.update(admin, { ...owned, title: "Admin Edit" }).title).toBe("Admin Edit");
  });
});
