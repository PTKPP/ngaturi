import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import invitations from "../../../contracts/dummy-data/invitations.json";
import { InvitationSchema } from "@/domain";
import { WeddingDefaultTemplate } from "@/templates/wedding-default/Template";
import type { WeddingRenderModel as WeddingDefaultContent } from "@/invitation-modules/schemas";
import { getRegisteredTheme } from "@/themes/registry";
import { themeCssVariables } from "@/themes/registry";
import { parseTemplateContent } from "@/templates/registry";
import { toWeddingRenderModel } from "@/invitation-modules/content";
import { InvitationMusicSchema, resolveInvitationMusic } from "@/invitation-music/registry";
import { InvitationExperienceShell } from "@/templates/shared/InvitationExperienceShell";
import giftFixture from "../../../contracts/dummy-data/gift-module-v2.json";
import { GiftModuleSchema } from "@/invitation-modules/definitions/gift";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("@/app/actions/wishes", () => ({
  submitWishAction: vi.fn(),
  listApprovedWishesAction: vi.fn(async () => ({ ok: true, items: [], nextCursor: null })),
}));

const playMock = vi.fn(function (this: HTMLMediaElement) {
  this.dispatchEvent(new Event("play"));
  return Promise.resolve();
});
const pauseMock = vi.fn(function (this: HTMLMediaElement) {
  this.dispatchEvent(new Event("pause"));
});

function fixture(overrides: Record<string, unknown> = {}) {
  const source = structuredClone(invitations[1]);
  return InvitationSchema.parse({ ...source, templateKey: "wedding-default", templateVersion: 1, content: { ...source.content, ...overrides } });
}

function renderTheme(overrides: Record<string, unknown> = {}, preview = false, configure?: (value: ReturnType<typeof parseTemplateContent>) => void) {
  const parsed = fixture(overrides); const { content: storedContent, ...invitation } = parsed;
  const moduleContent = parseTemplateContent("wedding-default", 1, 1, storedContent);
  configure?.(moduleContent);
  const content = toWeddingRenderModel(moduleContent) as WeddingDefaultContent;
  const theme = getRegisteredTheme("wedding-default-default", 1)!;
  const music = resolveInvitationMusic(InvitationMusicSchema.parse(moduleContent.modules.music));
  return render(<InvitationExperienceShell music={music} preview={preview} style={themeCssVariables(theme)}>
    <WeddingDefaultTemplate invitation={invitation} content={content} moduleContent={moduleContent} theme={theme} preview={preview} />
  </InvitationExperienceShell>);
}

describe("wedding-default template", () => {
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
    expect(view.container.querySelector('[data-template="wedding-default@1"]')).toBeInTheDocument();
    expect(screen.getAllByText("Dara").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bima").length).toBeGreaterThan(0);
    const content = view.container.textContent ?? "";
    expect(content.indexOf("Akad Nikah")).toBeLessThan(content.indexOf("Resepsi"));
    expect(screen.getByRole("heading", { name: "Cerita Kami" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tanda Kasih" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Galeri" })).not.toBeInTheDocument();
    const sources = [...view.container.querySelectorAll("img")].map((image) => decodeURIComponent(image.getAttribute("src") ?? ""));
    expect(sources.some((source) => source.includes("/templates/wedding-default/default-partner-one.svg"))).toBe(true);
    expect(sources.some((source) => source.includes("/templates/wedding-default/default-partner-two.svg"))).toBe(true);
  });

  it("hides conditional gallery and gift sections when disabled", () => {
    renderTheme({ settings: { showGiftInformation: false }, gallery: [] });
    expect(screen.queryByRole("heading", { name: "Tanda Kasih" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Galeri" })).not.toBeInTheDocument();
  });

  it("renders complete v2 optional sections from centralized module data", () => {
    renderTheme({ gallery: ["/templates/wedding-default/thumbnail.svg"] }, false, (moduleContent) => {
      const event = (moduleContent.modules.event as { items: Array<Record<string, unknown>> }).items[0];
      event.mapUrl = "https://maps.google.com/?q=Pendopo";
      moduleContent.modules.video = { provider: "youtube", videoId: "abcdefghijk", embedEnabled: true, legacyUnsupportedUrl: "" };
      moduleContent.modules.rsvp = { enabled: true };
      moduleContent.modules.wishes = { enabled: true };
      moduleContent.moduleState.video = { enabled: true };
      moduleContent.moduleState.rsvp = { enabled: true };
      moduleContent.moduleState.wishes = { enabled: true };
    });
    expect(screen.getByRole("heading", { name: "Cerita dalam gambar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "RSVP" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kirim Ucapan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Temukan tempatnya" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Galeri" })).toBeInTheDocument();
    expect(screen.queryByTitle("Video perjalanan pasangan")).not.toBeInTheDocument();
  });

  it("shows gallery only for provided images", () => {
    renderTheme({ gallery: ["/templates/wedding-default/thumbnail.svg"] });
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
    await waitFor(() => expect(writeText).toHaveBeenCalledWith((fixture().content.copy as Record<string, string>).giftInformation));
    expect(screen.getByText("Informasi hadiah berhasil disalin.")).toHaveAttribute("aria-live", "polite");
  });

  it("renders structured Gift module data through Daztore", () => {
    renderTheme({}, false, (moduleContent) => {
      moduleContent.modules.gift = GiftModuleSchema.parse(giftFixture);
      moduleContent.moduleVersions.gift = 2;
      moduleContent.moduleState.gift = { enabled: true };
    });
    expect(screen.getByRole("heading", { name: "BCA" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "GoPay" })).toBeInTheDocument();
    expect(screen.getByText("Jl. Melati No. 10, Bandung")).toBeInTheDocument();
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
