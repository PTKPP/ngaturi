import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import giftFixture from "../../../contracts/dummy-data/gift-module-v2.json";
import {
  GiftModuleSchema,
  giftModuleDefinition,
  maskGiftAccountIdentifier,
  maskGiftAddress,
  type GiftModule,
} from "@/invitation-modules/definitions/gift";
import { GiftModuleEditor } from "@/invitation-modules/editors/GiftModuleEditor";
import { GiftSection } from "@/templates/wedding-default/components/GiftSection";

const fixture = () => GiftModuleSchema.parse(structuredClone(giftFixture));

function EditorHarness({ initial = fixture() }: { initial?: GiftModule }) {
  const [value, setValue] = useState(initial);
  return <><GiftModuleEditor value={value} onChange={setValue} /><output data-testid="gift-value">{JSON.stringify(value)}</output></>;
}

describe("structured Gift module", () => {
  it("normalizes valid data and enforces field, duplicate, physical-address, and account limits", () => {
    const normalized = GiftModuleSchema.parse({
      ...fixture(),
      bankAccounts: [{ ...fixture().bankAccounts[0], provider: "  Bank   Central Asia ", accountHolder: " Dara   Permata " }],
    });
    expect(normalized.bankAccounts[0]).toMatchObject({ provider: "Bank Central Asia", accountHolder: "Dara Permata" });
    expect(() => GiftModuleSchema.parse({ ...fixture(), bankAccounts: [{ ...fixture().bankAccounts[0], provider: "" }] })).toThrow();
    expect(() => GiftModuleSchema.parse({ ...fixture(), physicalGift: { enabled: true, recipient: "Dara", address: "Pendek", note: "" } })).toThrow("Alamat hadiah fisik");
    expect(() => GiftModuleSchema.parse({ ...fixture(), bankAccounts: [fixture().bankAccounts[0], { ...fixture().bankAccounts[0], id: "550e8400-e29b-41d4-a716-446655440000", accountNumber: "1234-5678-90" }] })).toThrow("duplikat");
    const tooMany = Array.from({ length: 6 }, (_, index) => ({ ...fixture().bankAccounts[0], id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, accountNumber: `9000000${index}` }));
    expect(() => GiftModuleSchema.parse({ ...fixture(), bankAccounts: tooMany })).toThrow();
  });

  it("migrates legacy gift@1 text to gift@2 without losing the original information", () => {
    expect(giftModuleDefinition.version).toBe(2);
    expect(giftModuleDefinition.migrate(1, { text: "Transfer ke rekening keluarga." })).toEqual({
      bankAccounts: [], eWallets: [], physicalGift: { enabled: false, recipient: "", address: "", note: "" }, legacyText: "Transfer ke rekening keluarga.",
    });
  });

  it("masks sensitive editor summaries while preserving explicit reveal and safe copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<EditorHarness />);
    expect(screen.getAllByText(maskGiftAccountIdentifier("1234 5678 90"), { exact: false })).not.toHaveLength(0);
    expect(screen.getByText(maskGiftAddress("Jl. Melati No. 10, Bandung"), { exact: false })).toBeInTheDocument();
    const number = screen.getByLabelText("Nomor bank 1");
    expect(number).toHaveAttribute("type", "password");
    fireEvent.click(screen.getAllByRole("button", { name: "Tampilkan nomor" })[0]);
    expect(number).toHaveAttribute("type", "text");
    fireEvent.click(screen.getAllByRole("button", { name: "Salin nomor" })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("1234 5678 90"));
  });

  it("adds, reorders, removes, and rejects duplicate accounts in the reusable editor", () => {
    render(<EditorHarness />);
    fireEvent.change(screen.getByLabelText("Provider rekening bank baru"), { target: { value: "Mandiri" } });
    fireEvent.change(screen.getByLabelText("Atas nama rekening bank baru"), { target: { value: "Keluarga Dara" } });
    fireEvent.change(screen.getByLabelText("Nomor rekening bank baru"), { target: { value: "99887766" } });
    fireEvent.click(screen.getByRole("button", { name: "Tambah rekening bank" }));
    let stored = GiftModuleSchema.parse(JSON.parse(screen.getByTestId("gift-value").textContent ?? "{}"));
    expect(stored.bankAccounts.map((account) => account.provider)).toEqual(["BCA", "Mandiri"]);
    const firstCard = screen.getByText("BCA", { selector: "strong" }).closest("article")!;
    fireEvent.click(within(firstCard).getByRole("button", { name: "Turun" }));
    stored = GiftModuleSchema.parse(JSON.parse(screen.getByTestId("gift-value").textContent ?? "{}"));
    expect(stored.bankAccounts.map((account) => account.provider)).toEqual(["Mandiri", "BCA"]);
    fireEvent.click(within(screen.getByText("BCA", { selector: "strong" }).closest("article")!).getByRole("button", { name: "Hapus" }));
    stored = GiftModuleSchema.parse(JSON.parse(screen.getByTestId("gift-value").textContent ?? "{}"));
    expect(stored.bankAccounts.map((account) => account.provider)).toEqual(["Mandiri"]);

    fireEvent.change(screen.getByLabelText("Provider rekening bank baru"), { target: { value: "Mandiri" } });
    fireEvent.change(screen.getByLabelText("Atas nama rekening bank baru"), { target: { value: "Nama lain" } });
    fireEvent.change(screen.getByLabelText("Nomor rekening bank baru"), { target: { value: "99-887-766" } });
    fireEvent.click(screen.getByRole("button", { name: "Tambah rekening bank" }));
    expect(screen.getByText(/Akun hadiah duplikat/)).toBeInTheDocument();
    stored = GiftModuleSchema.parse(JSON.parse(screen.getByTestId("gift-value").textContent ?? "{}"));
    expect(stored.bankAccounts).toHaveLength(1);
    fireEvent.click(screen.getByRole("checkbox", { name: "Tampilkan alamat hadiah fisik" }));
    stored = GiftModuleSchema.parse(JSON.parse(screen.getByTestId("gift-value").textContent ?? "{}"));
    expect(stored.physicalGift.enabled).toBe(false);
  });

  it("renders structured public cards, copies the exact value, and hides disabled physical data", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const view = render(<GiftSection gift={fixture()} />);
    expect(screen.getByRole("heading", { name: "BCA" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "GoPay" })).toBeInTheDocument();
    expect(screen.getByText("Jl. Melati No. 10, Bandung")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Salin nomor" })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("1234 5678 90"));
    expect(screen.getByText("Nomor BCA berhasil disalin.")).toBeInTheDocument();
    view.unmount();
    render(<GiftSection gift={{ ...fixture(), physicalGift: { ...fixture().physicalGift, enabled: false, address: "Alamat privat tidak boleh tampil" } }} />);
    expect(screen.queryByText("Alamat privat tidak boleh tampil")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salin alamat" })).not.toBeInTheDocument();
  });
});
