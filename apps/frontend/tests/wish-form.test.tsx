import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ submitWishAction: vi.fn(), listApprovedWishesAction: vi.fn() }));
vi.mock("@/app/actions/wishes", () => mocks);

import { WishesSection } from "@/templates/daztore-inv1/components/WishesSection";

const invitationId = "3e531e88-863c-4344-baf4-c3d8349f13db";

describe("Daztore Wishes form and approved list", () => {
  beforeEach(() => {
    mocks.submitWishAction.mockReset().mockResolvedValue({ ok: true, submittedAt: "2026-08-29T00:00:00.000Z", idempotent: false });
    mocks.listApprovedWishesAction.mockReset().mockResolvedValue({
      ok: true,
      items: [{ id: "one", guestName: "Tamu Lama", message: "Selamat berbahagia", createdAt: "2026-08-29T00:00:00.000Z" }],
      nextCursor: null,
    });
  });

  it("submits once without reload and explains pending moderation", async () => {
    render(<WishesSection invitationId={invitationId} />);
    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Tamu Baru" } });
    fireEvent.change(screen.getByLabelText("Ucapan"), { target: { value: "Doa terbaik untuk kalian" } });
    const button = screen.getByRole("button", { name: "Kirim Ucapan" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText(/setelah melalui moderasi/)).toBeInTheDocument());
    expect(mocks.submitWishAction).toHaveBeenCalledTimes(1);
    expect(mocks.submitWishAction).toHaveBeenCalledWith(expect.objectContaining({ invitationId, guestName: "Tamu Baru", message: "Doa terbaik untuk kalian" }));
    expect(mocks.submitWishAction.mock.calls[0][0].clientSubmissionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("renders only the bounded approved projection returned by the server and an empty state", async () => {
    const view = render(<WishesSection invitationId={invitationId} />);
    await waitFor(() => expect(screen.getByText(/Selamat berbahagia/)).toBeInTheDocument());
    expect(screen.getByText("Tamu Lama")).toBeInTheDocument();
    view.unmount();
    mocks.listApprovedWishesAction.mockResolvedValueOnce({ ok: true, items: [], nextCursor: null });
    render(<WishesSection invitationId={invitationId} />);
    await waitFor(() => expect(screen.getByText(/Belum ada ucapan yang disetujui/)).toBeInTheDocument());
  });

  it("supports cursor load-more without replacing existing wishes", async () => {
    mocks.listApprovedWishesAction
      .mockResolvedValueOnce({ ok: true, items: [{ id: "one", guestName: "Satu", message: "Pertama", createdAt: "2026-08-29T01:00:00.000Z" }], nextCursor: { createdAt: "2026-08-29T01:00:00.000Z", id: "00000000-0000-4000-8000-000000000001" } })
      .mockResolvedValueOnce({ ok: true, items: [{ id: "two", guestName: "Dua", message: "Kedua", createdAt: "2026-08-29T00:00:00.000Z" }], nextCursor: null });
    render(<WishesSection invitationId={invitationId} />);
    await waitFor(() => expect(screen.getByText(/Pertama/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Muat ucapan lainnya" }));
    await waitFor(() => expect(screen.getByText(/Kedua/)).toBeInTheDocument());
    expect(screen.getByText(/Pertama/)).toBeInTheDocument();
  });

  it("disables guest operations in owner preview", () => {
    render(<WishesSection invitationId={invitationId} preview />);
    expect(screen.getByRole("button", { name: "Kirim Ucapan" })).toBeDisabled();
    expect(mocks.listApprovedWishesAction).not.toHaveBeenCalled();
  });
});
