import { beforeEach, describe, expect, it } from "vitest";
import { createDemoRuntime } from "@/lib/demo-runtime";

describe("admin user management and route quota", () => {
  beforeEach(() => localStorage.clear());
  it("lets admin create a user with an initial route quota and enforces unique email", () => {
    const runtime = createDemoRuntime(localStorage);
    const admin = runtime.auth.login("admin@demo.local", "admin-demo");
    const created = runtime.userService.create(admin, { name: "User Baru", email: "baru@demo.local", role: "user", routeQuota: 4 });
    expect(created).toMatchObject({ status: "active", routeQuota: 4 });
    expect(() => runtime.userService.create(admin, { name: "Duplikat", email: "BARU@demo.local", role: "user", routeQuota: 1 })).toThrow("Email sudah digunakan");
  });
  it("rejects non-admin quota, creation, and status mutations", () => {
    const runtime = createDemoRuntime(localStorage);
    const user = runtime.auth.login("user@demo.local", "user-demo");
    expect(() => runtime.userService.setRouteQuota(user, "usr_owner_demo", 5)).toThrow("hanya dapat dilakukan admin");
    expect(() => runtime.userService.create(user, { name: "Tidak Sah", email: "x@demo.local", role: "user", routeQuota: 1 })).toThrow("hanya dapat dilakukan admin");
    expect(() => runtime.userService.toggleStatus(user, "usr_inactive_demo")).toThrow("hanya dapat dilakukan admin");
  });
  it("rejects negative quota and lowering below allocated route count without deleting routes", () => {
    const runtime = createDemoRuntime(localStorage); const admin = runtime.auth.login("admin@demo.local", "admin-demo");
    const before = runtime.routes.list();
    expect(() => runtime.userService.setRouteQuota(admin, "usr_owner_demo", -1)).toThrow("non-negatif");
    expect(() => runtime.userService.setRouteQuota(admin, "usr_owner_demo", 1)).toThrow("tidak boleh lebih kecil");
    expect(runtime.routes.list()).toEqual(before);
  });
  it("lets admin increase and safely reduce quota to current usage", () => {
    const runtime = createDemoRuntime(localStorage); const admin = runtime.auth.login("admin@demo.local", "admin-demo");
    expect(runtime.userService.setRouteQuota(admin, "usr_owner_demo", 5).routeQuota).toBe(5);
    expect(runtime.userService.setRouteQuota(admin, "usr_owner_demo", 2).routeQuota).toBe(2);
  });
  it("does not let admin deactivate the current session", () => {
    const runtime = createDemoRuntime(localStorage); const admin = runtime.auth.login("admin@demo.local", "admin-demo");
    expect(() => runtime.userService.toggleStatus(admin, admin.userId)).toThrow("session sendiri");
  });
});
