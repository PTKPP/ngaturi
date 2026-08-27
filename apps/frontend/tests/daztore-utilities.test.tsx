import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InvitationEvent } from "@/domain";
import { Countdown } from "@/templates/daztore-inv1/components/Countdown";
import { Reveal } from "@/templates/daztore-inv1/components/Reveal";
import { buildGoogleCalendarUrl } from "@/templates/daztore-inv1/utilities/calendar";
import { eventTargetInstant, getCountdownParts } from "@/templates/daztore-inv1/utilities/countdown";
import { RECIPIENT_MAX_LENGTH, sanitizeRecipient } from "@/templates/daztore-inv1/utilities/recipient";

const event: InvitationEvent = {
  id: "event-test",
  type: "ceremony",
  title: "Akad Demo",
  date: "2026-10-10",
  startTime: "08:00",
  endTime: "09:30",
  timezone: "Asia/Jakarta",
  venueName: "Balai Demo",
  address: "Jalan Demo 10",
  mapUrl: "https://maps.example.com/demo",
  sortOrder: 0,
};

afterEach(() => vi.useRealTimers());

describe("daztore recipient, countdown, and calendar utilities", () => {
  it("sanitizes recipient text and limits its length", () => {
    expect(sanitizeRecipient("  Nama   Tamu  ")).toBe("Nama Tamu");
    expect(sanitizeRecipient(null)).toBe("Tamu Undangan");
    expect(sanitizeRecipient("x".repeat(140))).toHaveLength(RECIPIENT_MAX_LENGTH);
  });

  it("converts the event wall time using its IANA timezone", () => {
    expect(eventTargetInstant(event)?.toISOString()).toBe("2026-10-10T01:00:00.000Z");
    expect(eventTargetInstant({ ...event, timezone: "Invalid/Timezone" })).toBeNull();
    expect(getCountdownParts(new Date("2026-10-10T01:00:00.000Z"), new Date("2026-10-11T01:00:00.000Z"))).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it("builds an encoded non-hardcoded Google Calendar URL", () => {
    const url = new URL(buildGoogleCalendarUrl(event, "Undangan Nara & Bima"));
    expect(url.origin).toBe("https://calendar.google.com");
    expect(url.searchParams.get("text")).toBe("Akad Demo — Undangan Nara & Bima");
    expect(url.searchParams.get("dates")).toBe("20261010T080000/20261010T093000");
    expect(url.searchParams.get("ctz")).toBe("Asia/Jakarta");
    expect(url.searchParams.get("location")).toBe("Balai Demo, Jalan Demo 10");
  });

  it("cleans up the countdown interval on unmount", () => {
    vi.useFakeTimers();
    const view = render(<Countdown event={event} />);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("disconnects reveal observation on unmount", () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    class Observer {
      observe = observe;
      disconnect = disconnect;
    }
    vi.stubGlobal("IntersectionObserver", Observer);
    const view = render(<Reveal>Isi</Reveal>);
    expect(observe).toHaveBeenCalled();
    view.unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
