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

  it("migrates valid version-one storage without metadata in place", () => {
    seedDemoData(localStorage);
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.users) ?? "[]");
    users[0].name = "Perubahan Lama";
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    localStorage.removeItem(STORAGE_KEYS.metadata);
    const runtime = createDemoRuntime(localStorage);
    expect(runtime.users.findById("usr_admin_demo")?.name).toBe("Perubahan Lama");
    expect(localStorage.getItem(STORAGE_KEYS.metadata)).not.toBeNull();
  });

  it("requires controlled reset for the previous schema metadata", () => {
    seedDemoData(localStorage);
    const metadata = JSON.parse(localStorage.getItem(STORAGE_KEYS.metadata) ?? "{}");
    localStorage.setItem(STORAGE_KEYS.metadata, JSON.stringify({ ...metadata, schemaVersion: SCHEMA_VERSION - 1 }));
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
