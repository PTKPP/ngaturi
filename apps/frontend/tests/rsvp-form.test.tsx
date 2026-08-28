import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ submitRsvpAction: vi.fn() }));
vi.mock("@/app/actions/rsvp", () => ({ submitRsvpAction: mocks.submitRsvpAction }));

import { RsvpSection } from "@/templates/daztore-inv1/components/RsvpSection";

const invitationId = "3e531e88-863c-4344-baf4-c3d8349f13db";

describe("Daztore RSVP form", () => {
  beforeEach(() => {
    mocks.submitRsvpAction.mockReset();
    mocks.submitRsvpAction.mockResolvedValue({ ok: true, submittedAt: "2026-08-28T00:00:00.000Z", idempotent: false });
  });

  it("submits without page reload, prevents duplicate clicks, and renders success", async () => {
    render(<RsvpSection invitationId={invitationId} />);
    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Tamu Satu" } });
    fireEvent.change(screen.getByLabelText("Jumlah tamu"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Pesan atau catatan/), { target: { value: "Sampai bertemu" } });
    const submit = screen.getByRole("button", { name: "Kirim RSVP" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByText(/RSVP Anda sudah tercatat/)).toBeInTheDocument());
    expect(mocks.submitRsvpAction).toHaveBeenCalledTimes(1);
    expect(mocks.submitRsvpAction).toHaveBeenCalledWith(expect.objectContaining({ invitationId, guestName: "Tamu Satu", attendanceStatus: "attending", guestCount: 3, note: "Sampai bertemu" }));
    expect(mocks.submitRsvpAction.mock.calls[0][0].clientSubmissionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sends zero guests for not attending and shows a friendly server error", async () => {
    mocks.submitRsvpAction.mockResolvedValueOnce({ ok: false, code: "RSVP_RATE_LIMITED", message: "Terlalu banyak percobaan. Silakan tunggu beberapa menit lalu coba lagi." });
    render(<RsvpSection invitationId={invitationId} />);
    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Tamu Dua" } });
    fireEvent.click(screen.getByLabelText("Tidak hadir"));
    expect(screen.queryByLabelText("Jumlah tamu")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kirim RSVP" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Terlalu banyak percobaan"));
    expect(mocks.submitRsvpAction).toHaveBeenCalledWith(expect.objectContaining({ attendanceStatus: "not_attending", guestCount: 0 }));
  });

  it("disables submission in owner preview", () => {
    render(<RsvpSection invitationId={invitationId} preview />);
    expect(screen.getByRole("button", { name: "Kirim RSVP" })).toBeDisabled();
    expect(screen.getByText(/dinonaktifkan pada preview owner/)).toBeInTheDocument();
  });
});
