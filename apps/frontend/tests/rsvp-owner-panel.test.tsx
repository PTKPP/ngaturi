import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RsvpOwnerPanel } from "@/components/RsvpOwnerPanel";

describe("owner RSVP read model", () => {
  it("renders all summary metrics and the owner-only response projection", () => {
    render(<RsvpOwnerPanel
      summary={{ attending: 2, notAttending: 1, attendingGuestCount: 5, totalResponses: 3 }}
      responses={[{ id: "one", guestName: "Tamu Satu", attendanceStatus: "attending", guestCount: 2, note: "Sampai bertemu", createdAt: "2026-08-28T00:00:00.000Z" }]}
    />);
    expect(screen.getByText("Respons hadir").previousSibling).toHaveTextContent("2");
    expect(screen.getByText("Respons tidak hadir").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("Total tamu hadir").previousSibling).toHaveTextContent("5");
    expect(screen.getByText("Total respons").previousSibling).toHaveTextContent("3");
    expect(screen.getByText("Tamu Satu")).toBeInTheDocument();
    expect(screen.getByText("Sampai bertemu")).toBeInTheDocument();
  });
});
