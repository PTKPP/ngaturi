import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import invitations from "../../../contracts/dummy-data/invitations.json";
import { InvitationSchema } from "@/domain";
import { DaztoreInv1Template } from "@/templates/themes/daztore-inv1/Template";
import { getRegisteredTheme } from "@/templates/theme-registry";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const playMock = vi.fn(function (this: HTMLMediaElement) {
  this.dispatchEvent(new Event("play"));
  return Promise.resolve();
});
const pauseMock = vi.fn(function (this: HTMLMediaElement) {
  this.dispatchEvent(new Event("pause"));
});

function fixture(overrides: Record<string, unknown> = {}) {
  return InvitationSchema.parse({ ...structuredClone(invitations[1]), templateKey: "daztore-inv1", templateVersion: 1, ...overrides });
}

function renderTheme(overrides: Record<string, unknown> = {}, preview = false) {
  return render(<DaztoreInv1Template invitation={fixture(overrides)} theme={getRegisteredTheme("daztore-inv1-default", 1)!} preview={preview} />);
}

describe("daztore-inv1 theme", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/dara-dan-bima");
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    if (!HTMLElement.prototype.scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: () => undefined });
    }
    vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(playMock);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pauseMock);
    playMock.mockClear();
    pauseMock.mockClear();
  });

  it("renders dynamic couple, ordered events, story, gift, and local photo fallbacks", () => {
    const view = renderTheme();
    expect(view.container.querySelector('[data-template="daztore-inv1@1"]')).toBeInTheDocument();
    expect(screen.getAllByText("Dara").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bima").length).toBeGreaterThan(0);
    const content = view.container.textContent ?? "";
    expect(content.indexOf("Akad Nikah")).toBeLessThan(content.indexOf("Resepsi"));
    expect(screen.getByRole("heading", { name: "Cerita Kami" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tanda Kasih" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Galeri" })).not.toBeInTheDocument();
    const sources = [...view.container.querySelectorAll("img")].map((image) => image.getAttribute("src"));
    expect(sources.some((source) => source?.endsWith("/templates/daztore-inv1/default-partner-one.svg"))).toBe(true);
    expect(sources.some((source) => source?.endsWith("/templates/daztore-inv1/default-partner-two.svg"))).toBe(true);
  });

  it("hides conditional gallery and gift sections when disabled", () => {
    renderTheme({ settings: { showGiftInformation: false }, gallery: [] });
    expect(screen.queryByRole("heading", { name: "Tanda Kasih" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Galeri" })).not.toBeInTheDocument();
  });

  it("shows gallery only for provided images", () => {
    renderTheme({ gallery: ["/templates/daztore-inv1/thumbnail.svg"] });
    expect(screen.getByRole("heading", { name: "Galeri" })).toBeInTheDocument();
    expect(screen.getByAltText(/Momen Dara & Bima 1/)).toHaveAttribute("loading", "lazy");
  });

  it("opens the welcome cover with safe bounded recipient and starts audio only after interaction", async () => {
    window.history.replaceState({}, "", `/?to=${encodeURIComponent(`<img src=x onerror=alert(1)> ${"T".repeat(120)}`)}`);
    renderTheme();
    const recipient = screen.getByTestId("recipient");
    expect(recipient.textContent?.length).toBeLessThanOrEqual(100);
    expect(recipient.querySelector("img")).toBeNull();
    expect(playMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Buka Undangan" }));
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "Jeda musik" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Jeda musik" }));
    expect(pauseMock).toHaveBeenCalled();
  });

  it("does not start preview audio when the cover opens", () => {
    renderTheme({}, true);
    fireEvent.click(screen.getByRole("button", { name: "Buka Undangan" }));
    expect(playMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Putar musik" })).toBeInTheDocument();
  });

  it("copies the complete gift string and announces feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderTheme();
    fireEvent.click(screen.getByRole("button", { name: "Salin Informasi Hadiah" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(fixture().content.giftInformation));
    expect(screen.getByText("Informasi hadiah berhasil disalin.")).toHaveAttribute("aria-live", "polite");
  });

  it("shows navigation only for rendered sections and one initial active item", () => {
    renderTheme({ settings: { showGiftInformation: false }, gallery: [] });
    fireEvent.click(screen.getByRole("button", { name: "Buka Undangan" }));
    const navigation = screen.getByRole("navigation", { name: "Navigasi undangan" });
    expect(within(navigation).getAllByRole("link").map((link) => link.textContent)).toEqual(["Home", "Mempelai", "Acara"]);
    expect(within(navigation).getAllByRole("link").filter((link) => link.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it("stops audio during unmount cleanup", () => {
    const view = renderTheme();
    fireEvent.click(screen.getByRole("button", { name: "Buka Undangan" }));
    view.unmount();
    expect(pauseMock).toHaveBeenCalled();
  });
});
