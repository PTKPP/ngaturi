import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditInvitationPage from "@/app/dashboard/invitations/[id]/edit/page";
import { DemoProvider } from "@/components/DemoProvider";
import { createDemoRuntime } from "@/lib/demo-runtime";
import { STORAGE_KEYS } from "@/repositories/mock";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "inv_owner_draft" }),
  usePathname: () => "/dashboard/invitations/inv_owner_draft/edit",
  useRouter: () => ({ replace: replaceMock }),
}));

function renderEditor() {
  return render(<StrictMode><DemoProvider><EditInvitationPage /></DemoProvider></StrictMode>);
}

describe("multi-event invitation editor", () => {
  beforeEach(() => {
    localStorage.clear();
    createDemoRuntime(localStorage).auth.login("user@demo.local", "user-demo");
    replaceMock.mockReset();
  });

  it("adds, edits, reorders, and persists multiple events", async () => {
    renderEditor();
    await screen.findByRole("heading", { name: "Rangkaian acara" });
    expect(screen.getAllByRole("group")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Tambah acara" }));
    const groups = screen.getAllByRole("group");
    expect(groups).toHaveLength(3);
    fireEvent.change(within(groups[2]).getByLabelText("Judul acara"), { target: { value: "Syukuran" } });
    fireEvent.click(within(groups[2]).getByRole("button", { name: "Naikkan Syukuran" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    expect(await screen.findByText("Perubahan tersimpan di browser.")).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.invitations) ?? "[]");
    const invitation = stored.find((item: { id: string }) => item.id === "inv_owner_draft");
    expect(invitation.events.map((event: { title: string }) => event.title)).toEqual(["Akad", "Syukuran", "Resepsi"]);
    expect(invitation.events.map((event: { sortOrder: number }) => event.sortOrder)).toEqual([0, 1, 2]);
  });

  it("shows domain validation when an event ends before it starts", async () => {
    renderEditor();
    const first = (await screen.findAllByRole("group"))[0];
    fireEvent.change(within(first).getByLabelText("Selesai"), { target: { value: "07:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Waktu selesai harus setelah waktu mulai"));
  });
});
