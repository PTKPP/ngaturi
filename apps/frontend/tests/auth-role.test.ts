import { beforeEach, describe, expect, it } from "vitest";
import { createDemoRuntime } from "@/lib/demo-runtime";
import { canAccessPath } from "@/services";
import { STORAGE_KEYS } from "@/repositories/mock";

describe("mock authentication and access", () => {
  beforeEach(() => localStorage.clear());

  it("logs in admin and user demo accounts", () => {
    const runtime = createDemoRuntime(localStorage);
    expect(runtime.auth.login("admin@demo.local", "admin-demo").role).toBe("admin");
    runtime.auth.logout();
    expect(runtime.auth.login("user@demo.local", "user-demo").role).toBe("user");
  });
  it("rejects wrong passwords and inactive users", () => {
    const runtime = createDemoRuntime(localStorage);
    expect(() => runtime.auth.login("user@demo.local", "wrong")).toThrow("Email atau password");
    expect(() => runtime.auth.login("inactive@demo.local", "inactive-demo")).toThrow("nonaktif");
  });
  it("clears the session on logout", () => {
    const runtime = createDemoRuntime(localStorage);
    runtime.auth.login("user@demo.local", "user-demo"); runtime.auth.logout();
    expect(runtime.auth.current()).toBeNull();
  });
  it("keeps guest out of dashboard and user out of admin", () => {
    const runtime = createDemoRuntime(localStorage);
    const user = runtime.auth.login("user@demo.local", "user-demo");
    expect(canAccessPath(null, "/dashboard")).toBe(false);
    expect(canAccessPath(user, "/dashboard/invitations")).toBe(true);
    expect(canAccessPath(user, "/admin/users")).toBe(false);
    expect(canAccessPath(null, "/dara-dan-bima")).toBe(true);
  });
  it.each([
    ["inactive", (users: Array<Record<string, unknown>>) => users.map((user) => user.id === "usr_owner_demo" ? { ...user, status: "inactive" } : user)],
    ["missing", (users: Array<Record<string, unknown>>) => users.filter((user) => user.id !== "usr_owner_demo")],
    ["role-mismatched", (users: Array<Record<string, unknown>>) => users.map((user) => user.id === "usr_owner_demo" ? { ...user, role: "admin" } : user)],
  ])("invalidates a persisted session when the user is %s", (_case, mutate) => {
    const runtime = createDemoRuntime(localStorage);
    runtime.auth.login("user@demo.local", "user-demo");
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.users) ?? "[]");
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(mutate(users)));
    expect(runtime.auth.current()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.session)).toBeNull();
  });
});
