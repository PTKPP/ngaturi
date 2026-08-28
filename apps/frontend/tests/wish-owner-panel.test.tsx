import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listOwnedWishesAction: vi.fn(), moderateWishAction: vi.fn() }));
vi.mock("@/app/actions/wishes", () => mocks);

import { WishesOwnerPanel } from "@/components/WishesOwnerPanel";

const invitationId = "3e531e88-863c-4344-baf4-c3d8349f13db";
const wish = { id: "one", guestName: "Tamu Satu", message: "Doa terbaik", status: "pending" as const, createdAt: "2026-08-29T00:00:00.000Z", updatedAt: "2026-08-29T00:00:00.000Z" };

describe("owner Wishes moderation panel", () => {
  beforeEach(() => {
    mocks.listOwnedWishesAction.mockReset().mockResolvedValue({ ok: true, summary: { pending: 0, approved: 1, rejected: 0, total: 1 }, wishes: [], status: "pending", offset: 0 });
    mocks.moderateWishAction.mockReset().mockResolvedValue({ ok: true, id: "one", status: "approved", updatedAt: "2026-08-29T01:00:00.000Z" });
  });

  it("renders status totals and sends optimistic concurrency metadata when approving", async () => {
    render(<WishesOwnerPanel invitationId={invitationId} initialSummary={{ pending: 1, approved: 0, rejected: 0, total: 1 }} initialWishes={[wish]} />);
    expect(screen.getAllByText("Menunggu")[0].previousSibling).toHaveTextContent("1");
    expect(screen.getByText("Total ucapan").previousSibling).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "Setujui" }));
    await waitFor(() => expect(mocks.moderateWishAction).toHaveBeenCalledWith({ invitationId, wishId: "one", status: "approved", expectedUpdatedAt: wish.updatedAt }));
    expect(mocks.listOwnedWishesAction).toHaveBeenCalledWith({ invitationId, status: "pending", offset: 0 });
  });

  it("loads a bounded status filter instead of fetching all moderation rows", async () => {
    mocks.listOwnedWishesAction.mockResolvedValueOnce({ ok: true, summary: { pending: 1, approved: 0, rejected: 0, total: 1 }, wishes: [], status: "rejected", offset: 0 });
    render(<WishesOwnerPanel invitationId={invitationId} initialSummary={{ pending: 1, approved: 0, rejected: 0, total: 1 }} initialWishes={[wish]} />);
    fireEvent.change(screen.getByLabelText("Filter status"), { target: { value: "rejected" } });
    await waitFor(() => expect(mocks.listOwnedWishesAction).toHaveBeenCalledWith({ invitationId, status: "rejected", offset: 0 }));
  });
});
