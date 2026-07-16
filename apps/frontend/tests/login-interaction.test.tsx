import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import { DemoProvider, useDemo } from "@/components/DemoProvider";
import { STORAGE_KEYS } from "@/repositories/mock";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

function renderLogin() {
  return render(<StrictMode><DemoProvider><LoginPage /></DemoProvider></StrictMode>);
}

async function readyLogin() {
  const button = await screen.findByRole("button", { name: "Masuk" });
  expect(button).toBeEnabled();
  return button;
}

function fillCredentials(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email demo"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password demo"), { target: { value: password } });
}

function SessionProbe() {
  const { status, session } = useDemo();
  return <p>{status}:{session?.userId ?? "none"}</p>;
}

describe("login page interaction with provider and browser storage", () => {
  beforeEach(() => {
    localStorage.clear();
    replaceMock.mockReset();
  });

  it("shows loading and finishes initialization with an enabled button", async () => {
    renderLogin();
    expect(screen.getByRole("status")).toHaveTextContent("Menyiapkan data demo");
    await readyLogin();
    expect(localStorage.getItem(STORAGE_KEYS.users)).not.toBeNull();
  });

  it("clicks the form and redirects a user to dashboard", async () => {
    renderLogin();
    fireEvent.click(await readyLogin());
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.session) ?? "{}")).toMatchObject({ userId: "usr_owner_demo", role: "user" });
  });

  it("clicks the form and redirects an admin to admin dashboard", async () => {
    renderLogin();
    await readyLogin();
    fillCredentials("admin@demo.local", "admin-demo");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/admin"));
  });

  it("keeps the button usable and shows a wrong-password error", async () => {
    renderLogin();
    await readyLogin();
    fillCredentials("user@demo.local", "wrong");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email atau password demo salah");
    expect(screen.getByRole("button", { name: "Masuk" })).toBeEnabled();
  });

  it("rejects an inactive user without locking the form", async () => {
    renderLogin();
    await readyLogin();
    fillCredentials("inactive@demo.local", "inactive-demo");
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("sedang nonaktif");
    expect(screen.getByRole("button", { name: "Masuk" })).toBeEnabled();
  });

  it("shows retry and reset recovery UI for invalid JSON", async () => {
    localStorage.setItem(STORAGE_KEYS.session, "{invalid-json");
    renderLogin();
    expect(await screen.findByRole("alert")).toHaveTextContent("tidak valid");
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reset data demo" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Masuk" })).not.toBeInTheDocument();
  });

  it("retries initialization after browser storage is repaired", async () => {
    localStorage.setItem(STORAGE_KEYS.session, "{invalid-json");
    renderLogin();
    await screen.findByRole("alert");
    localStorage.removeItem(STORAGE_KEYS.session);
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(screen.getByRole("status")).toHaveTextContent("Menyiapkan data demo");
    await readyLogin();
  });

  it("resets namespaced data while runtime is null", async () => {
    localStorage.setItem("other-app:value", "keep");
    localStorage.setItem(STORAGE_KEYS.session, "{invalid-json");
    renderLogin();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Reset data demo" }));
    await readyLogin();
    expect(localStorage.getItem("other-app:value")).toBe("keep");
    expect(localStorage.getItem(STORAGE_KEYS.session)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.metadata)).not.toBeNull();
  });

  it("controlled-resets legacy namespace without leaving login disabled", async () => {
    localStorage.setItem("ngaturi:mock:users", "[]");
    localStorage.setItem("other-app:value", "keep");
    renderLogin();
    await readyLogin();
    expect(localStorage.getItem("ngaturi:mock:users")).toBeNull();
    expect(localStorage.getItem("other-app:value")).toBe("keep");
  });

  it("offers recovery for incompatible explicit storage metadata", async () => {
    localStorage.setItem(STORAGE_KEYS.metadata, JSON.stringify({ storageVersion: 0, schemaVersion: 0, initializedAt: new Date().toISOString() }));
    renderLogin();
    expect(await screen.findByRole("alert")).toHaveTextContent("Versi data demo tidak kompatibel");
    fireEvent.click(screen.getByRole("button", { name: "Reset data demo" }));
    await readyLogin();
  });

  it("restores the persisted session after provider reload", async () => {
    const first = renderLogin();
    fireEvent.click(await readyLogin());
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    first.unmount();
    render(<StrictMode><DemoProvider><SessionProbe /></DemoProvider></StrictMode>);
    expect(await screen.findByText("ready:usr_owner_demo")).toBeInTheDocument();
  });
});
