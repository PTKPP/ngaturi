import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  MapsModuleSchema,
  normalizeMapUrl,
  normalizeVideoUrl,
  SupportedMapUrlSchema,
  VideoModuleSchema,
  videoEmbedUrl,
  videoExternalUrl,
} from "@/invitation-modules/definitions/external-embeds";
import { moduleRegistry } from "@/invitation-modules/registry";
import type { InvitationEvent } from "@/domain";
import { InvitationExperienceShell } from "@/templates/shared/InvitationExperienceShell";
import { VideoSection } from "@/templates/wedding-default/components/VideoSection";
import { MapsSection } from "@/templates/wedding-default/components/MapsSection";

const event: InvitationEvent = {
  id: "event-map",
  type: "reception",
  title: "Resepsi",
  date: "2026-12-01",
  startTime: "10:00",
  endTime: "12:00",
  timezone: "Asia/Jakarta",
  venueName: "Pendopo",
  address: "Jalan Melati 10, Bandung",
  mapUrl: "https://www.google.com/maps?q=Pendopo",
  sortOrder: 0,
};

describe("external video and maps contracts", () => {
  it("normalizes supported YouTube and Vimeo URLs into canonical provider IDs", () => {
    const youtube = normalizeVideoUrl("https://youtu.be/abcdefghijk?si=tracking");
    const vimeo = normalizeVideoUrl("https://player.vimeo.com/video/123456789");
    expect(youtube).toEqual({ provider: "youtube", videoId: "abcdefghijk" });
    expect(vimeo).toEqual({ provider: "vimeo", videoId: "123456789" });
    expect(videoExternalUrl(youtube!)).toBe("https://www.youtube.com/watch?v=abcdefghijk");
    expect(videoEmbedUrl(youtube!)).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0");
    expect(videoEmbedUrl(vimeo!)).toBe("https://player.vimeo.com/video/123456789?dnt=1");
  });

  it("rejects invalid providers, HTTP, arbitrary iframe markup, and malformed IDs", () => {
    expect(normalizeVideoUrl("https://example.com/watch?v=abcdefghijk")).toBeNull();
    expect(normalizeVideoUrl("http://youtu.be/abcdefghijk")).toBeNull();
    expect(normalizeVideoUrl("<iframe src=\"https://youtu.be/abcdefghijk\"></iframe>")).toBeNull();
    expect(VideoModuleSchema.safeParse({ provider: "youtube", videoId: "<script>", embedEnabled: true, legacyUnsupportedUrl: "" }).success).toBe(false);
  });

  it("migrates legacy video URLs and keeps unsupported HTTPS data inert", () => {
    expect(moduleRegistry.video.migrate(1, { url: "https://vimeo.com/123456789" })).toMatchObject({ provider: "vimeo", videoId: "123456789", embedEnabled: true });
    expect(moduleRegistry.video.migrate(1, { url: "https://video.example.com/legacy" })).toEqual({ provider: "none", videoId: "", embedEnabled: false, legacyUnsupportedUrl: "https://video.example.com/legacy" });
  });

  it("normalizes allowlisted map providers and rejects arbitrary destinations", () => {
    expect(normalizeMapUrl("https://maps.google.com/?q=Pendopo&utm_source=test")).toEqual({ provider: "google_maps", canonicalUrl: "https://www.google.com/maps?q=Pendopo" });
    expect(normalizeMapUrl("https://www.openstreetmap.org/#map=16/-6.9/107.6")?.provider).toBe("openstreetmap");
    expect(normalizeMapUrl("https://maps.example.com/place")).toBeNull();
    expect(SupportedMapUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("migrates legacy event links without exposing unsupported providers", () => {
    const base = { ...event, mapUrl: "https://maps.example.com/legacy" };
    const migrated = moduleRegistry.event.migrate(1, { items: [base] });
    expect(migrated.items[0]).toMatchObject({ mapUrl: "", legacyUnsupportedMapUrl: "https://maps.example.com/legacy" });
    expect(moduleRegistry.event.migrate(1, { items: [{ ...base, mapUrl: "https://maps.google.com/?q=Pendopo" }] }).items[0].mapUrl).toBe("https://www.google.com/maps?q=Pendopo");
  });

  it("does not load video iframe before consent and exposes a safe fallback", () => {
    vi.useFakeTimers();
    const telemetry = vi.fn();
    window.addEventListener("ngaturi:telemetry", telemetry);
    render(<InvitationExperienceShell music={null} preview={false}>
      <VideoSection video={VideoModuleSchema.parse({ provider: "youtube", videoId: "abcdefghijk", embedEnabled: true, legacyUnsupportedUrl: "" })} />
    </InvitationExperienceShell>);
    expect(screen.queryByTitle("Video perjalanan pasangan")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka di YouTube" })).toHaveAttribute("href", "https://www.youtube.com/watch?v=abcdefghijk");
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan video" }));
    const iframe = screen.getByTitle("Video perjalanan pasangan");
    expect(iframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0");
    expect(screen.getByRole("link", { name: "Buka di YouTube" })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(12_000));
    expect(screen.getByText(/Embed tidak dapat dimuat/)).toBeInTheDocument();
    expect(telemetry).toHaveBeenCalled();
    window.removeEventListener("ngaturi:telemetry", telemetry);
    vi.useRealTimers();
  });

  it("keeps maps address-first, honors embed enablement, and retains external fallback", () => {
    const enabled = MapsModuleSchema.parse({ label: "Buka Maps", embedEnabled: true });
    const view = render(<MapsSection events={[event]} config={enabled} />);
    expect(screen.getByText(event.address)).toBeInTheDocument();
    expect(view.container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan peta" }));
    expect(screen.getByTitle("Peta Pendopo")).toHaveAttribute("src", expect.stringContaining("https://www.google.com/maps?q="));
    view.unmount();

    render(<MapsSection events={[event]} config={MapsModuleSchema.parse({ label: "Buka Maps", embedEnabled: false })} />);
    expect(screen.queryByRole("button", { name: "Tampilkan peta" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka Maps" })).toHaveAttribute("href", event.mapUrl);
  });
});
