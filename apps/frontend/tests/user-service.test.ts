import { beforeEach, describe, expect, it } from "vitest";
import { createDemoRuntime } from "@/lib/demo-runtime";

describe("admin user management", () => {
  beforeEach(() => localStorage.clear());
  it("creates a user and enforces unique email", () => {
    const runtime = createDemoRuntime(localStorage);
    const created = runtime.userService.create({ name: "User Baru", email: "baru@demo.local", role: "user" });
    expect(created.status).toBe("active");
    expect(() => runtime.userService.create({ name: "Duplikat", email: "BARU@demo.local", role: "user" })).toThrow("Email sudah digunakan");
  });
  it("does not let admin deactivate the current session", () => {
    const runtime = createDemoRuntime(localStorage);
    const admin = runtime.auth.login("admin@demo.local", "admin-demo");
    expect(() => runtime.userService.toggleStatus(admin, admin.userId)).toThrow("session sendiri");
  });
});
