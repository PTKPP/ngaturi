import { beforeEach, describe, expect, it } from "vitest";
import { createDemoRuntime } from "@/lib/demo-runtime";
import { resetDemoData, seedDemoData, STORAGE_KEYS, STORAGE_VERSION, SCHEMA_VERSION } from "@/repositories/mock";

describe("mock persistence", () => {
  beforeEach(() => localStorage.clear());

  it("seeds only missing keys and preserves edits", () => {
    seedDemoData(localStorage);
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.users) ?? "[]");
    users[0].name = "Nama yang diubah";
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    seedDemoData(localStorage);
    expect(createDemoRuntime(localStorage).users.findById("usr_admin_demo")?.name).toBe("Nama yang diubah");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.metadata) ?? "{}")).toMatchObject({ storageVersion: STORAGE_VERSION, schemaVersion: SCHEMA_VERSION });
  });

  it("keeps valid current storage without metadata in place", () => {
    seedDemoData(localStorage);
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.users) ?? "[]");
    users[0].name = "Perubahan Lama";
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    localStorage.removeItem(STORAGE_KEYS.metadata);
    const runtime = createDemoRuntime(localStorage);
    expect(runtime.users.findById("usr_admin_demo")?.name).toBe("Perubahan Lama");
    expect(localStorage.getItem(STORAGE_KEYS.metadata)).not.toBeNull();
  });

  it("keeps legacy browser migration outside the production path and requires reset for old data", () => {
    seedDemoData(localStorage);
    const routes = JSON.parse(localStorage.getItem(STORAGE_KEYS.routes) ?? "[]");
    const routeById = new Map(routes.map((route: { id: string; slug: string }) => [route.id, route.slug]));
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.users) ?? "[]").map((storedUser: Record<string, unknown>) => { const user = { ...storedUser }; delete user.routeQuota; return user; });
    const invitations = JSON.parse(localStorage.getItem(STORAGE_KEYS.invitations) ?? "[]").map((storedInvitation: Record<string, unknown>) => {
      const invitation = { ...storedInvitation }; const routeId = String(invitation.routeId);
      delete invitation.routeId; delete invitation.themeKey; delete invitation.themeVersion;
      return { ...invitation, slug: routeById.get(routeId) };
    });
    invitations[0].content.story = "Edit lama tetap ada";
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.invitations, JSON.stringify(invitations));
    localStorage.removeItem(STORAGE_KEYS.routes); localStorage.removeItem(STORAGE_KEYS.themes);
    const metadata = JSON.parse(localStorage.getItem(STORAGE_KEYS.metadata) ?? "{}");
    localStorage.setItem(STORAGE_KEYS.metadata, JSON.stringify({ ...metadata, schemaVersion: 2 }));
    expect(() => createDemoRuntime(localStorage)).toThrow("Data demo");
  });

  it("requires controlled reset for incompatible explicit schema metadata", () => {
    seedDemoData(localStorage);
    const metadata = JSON.parse(localStorage.getItem(STORAGE_KEYS.metadata) ?? "{}");
    localStorage.setItem(STORAGE_KEYS.metadata, JSON.stringify({ ...metadata, schemaVersion: 1 }));
    expect(() => createDemoRuntime(localStorage)).toThrow("Versi data demo tidak kompatibel");
  });

  it("reset removes project namespace without touching another application", () => {
    localStorage.setItem("other-app:value", "keep");
    localStorage.setItem("ngaturi:mock:v1:future-key", "remove");
    seedDemoData(localStorage);
    resetDemoData(localStorage);
    expect(localStorage.getItem("other-app:value")).toBe("keep");
    expect(localStorage.getItem("ngaturi:mock:v1:future-key")).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.users)).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.session)).toBeNull();
  });
});
