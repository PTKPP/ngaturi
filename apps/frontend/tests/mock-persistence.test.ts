import { beforeEach, describe, expect, it } from "vitest";
import { createDemoRuntime } from "@/lib/demo-runtime";
import { resetDemoData, seedDemoData, STORAGE_KEYS } from "@/repositories/mock";

describe("mock persistence", () => {
  beforeEach(() => localStorage.clear());

  it("seeds only missing keys and preserves edits", () => {
    seedDemoData(localStorage);
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.users) ?? "[]");
    users[0].name = "Nama yang diubah";
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    seedDemoData(localStorage);
    expect(createDemoRuntime(localStorage).users.findById("usr_admin_demo")?.name).toBe("Nama yang diubah");
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
