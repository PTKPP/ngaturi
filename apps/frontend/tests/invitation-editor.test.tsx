import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import invitations from "../../../contracts/dummy-data/invitations.json";
import templates from "../../../contracts/dummy-data/templates.json";
import themes from "../../../contracts/dummy-data/themes.json";
import { InvitationSchema, TemplatesSchema, InvitationThemesSchema } from "@/domain";
import { toWeddingRenderModel } from "@/invitation-modules/content";
import type { InvitationAudioMedia, InvitationImageMedia } from "@/repositories/contracts";
import { parseTemplateContent } from "@/templates/registry";

vi.mock("@/app/actions/invitations", () => ({ saveInvitationAction: vi.fn(), switchTemplateAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));
vi.mock("@/app/actions/media", () => ({
  prepareImageUploadAction: vi.fn(),
  finalizeImageUploadAction: vi.fn(),
  failImageUploadAction: vi.fn(),
  updateImageAltAction: vi.fn(),
  prepareAudioUploadAction: vi.fn(),
  finalizeAudioUploadAction: vi.fn(),
  failAudioUploadAction: vi.fn(),
}));

import { InvitationEditorClient } from "@/components/InvitationEditorClient";

describe("generic template editor routing", () => {
  it("mounts upload controls instead of raw media IDs for Daztore", () => {
    const source = InvitationSchema.parse(invitations[0]);
    const invitation = InvitationSchema.parse({
      ...source,
      templateKey: "wedding-default",
      templateVersion: 1,
      themeKey: "wedding-default-default",
      themeVersion: 1,
    });
    render(<InvitationEditorClient initialInvitation={invitation} templates={TemplatesSchema.parse(templates)} themes={InvitationThemesSchema.parse(themes)} routeSlug="raka-dan-sinta-draft" />);
    expect(screen.getByText("Image undangan")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Upload foto/)).toHaveLength(2);
    expect(screen.getByLabelText(/Tambah image galeri/)).toHaveAttribute("multiple");
    expect(screen.queryByLabelText("Media ID foto partner satu")).not.toBeInTheDocument();
  });

  it("reorders gallery IDs and defers couple deletion until content save", () => {
    const partnerMediaId = "deedc4d0-708a-4db0-99cf-e8f90ad21762";
    const galleryOneId = "81a93121-f574-4990-8326-81c7be012559";
    const galleryTwoId = "825ce56d-cf80-4b61-b2d2-40f93f198035";
    const source = InvitationSchema.parse(invitations[0]);
    const content = structuredClone(invitations[0].content) as unknown as { couple: { partnerOne: { photo: string } }; gallery: string[]; [key: string]: unknown };
    content.couple.partnerOne.photo = partnerMediaId;
    content.gallery = [galleryOneId, galleryTwoId];
    const invitation = InvitationSchema.parse({ ...source, templateKey: "wedding-default", templateVersion: 1, themeKey: "wedding-default-default", themeVersion: 1, content });
    const media = [partnerMediaId, galleryOneId, galleryTwoId].map((id, index): InvitationImageMedia => ({
      kind: "image",
      id,
      invitationId: invitation.id,
      purpose: index === 0 ? "couple" : "gallery",
      altText: "Image " + (index + 1),
      originalFilename: "image-" + index + ".jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1000,
      width: 1200,
      height: 800,
      status: "ready",
      createdAt: "2026-08-27T00:00:00.000Z",
      variants: [],
    }));
    const view = render(<InvitationEditorClient initialInvitation={invitation} initialMedia={media} templates={TemplatesSchema.parse(templates)} themes={InvitationThemesSchema.parse(themes)} routeSlug="raka-dan-sinta-draft" />);
    const firstGalleryCard = screen.getByRole("heading", { name: "Image 1" }).closest("article")!;
    fireEvent.click(within(firstGalleryCard).getByRole("button", { name: "Turun" }));
    let stored = InvitationSchema.parse(JSON.parse(view.container.querySelector<HTMLInputElement>('input[name="invitation"]')!.value));
    expect(toWeddingRenderModel(stored.content as never).gallery).toEqual([galleryTwoId, galleryOneId]);
    const partnerCard = screen.getByRole("heading", { name: "Foto Raka Pradana" }).closest("article")!;
    fireEvent.click(within(partnerCard).getByRole("button", { name: "Hapus foto" }));
    stored = InvitationSchema.parse(JSON.parse(view.container.querySelector<HTMLInputElement>('input[name="invitation"]')!.value));
    expect(toWeddingRenderModel(stored.content as never).couple.partnerOne.photo).toBe("");
    expect(JSON.parse(view.container.querySelector<HTMLInputElement>('input[name="deleteMediaIds"]')!.value)).toEqual([partnerMediaId]);
  });

  it("renders the registered editor and serializes edited template content", () => {
    const invitation = InvitationSchema.parse(invitations[0]);
    const view = render(<InvitationEditorClient initialInvitation={invitation} templates={TemplatesSchema.parse(templates)} themes={InvitationThemesSchema.parse(themes)} routeSlug="raka-dan-sinta-draft" />);
    expect(view.container.querySelector("[data-template-editor]")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Teks pembuka"), { target: { value: "Teks baru" } });
    fireEvent.click(screen.getByRole("button", { name: "Tambah acara" }));
    const serialized = view.container.querySelector<HTMLInputElement>('input[name="invitation"]')?.value ?? "{}";
    const stored = InvitationSchema.parse(JSON.parse(serialized));
    const projected = toWeddingRenderModel(stored.content as never);
    expect(projected.copy.openingText).toBe("Teks baru");
    expect(projected.events).toHaveLength(3);
  });

  it("enables and disables Gift through reusable module capability state", () => {
    const source = InvitationSchema.parse(invitations[0]);
    const invitation = InvitationSchema.parse({ ...source, templateKey: "wedding-default", templateVersion: 1, themeKey: "wedding-default-default", themeVersion: 1 });
    const view = render(<InvitationEditorClient initialInvitation={invitation} templates={TemplatesSchema.parse(templates)} themes={InvitationThemesSchema.parse(themes)} routeSlug="raka-dan-sinta-draft" />);
    const toggle = screen.getByRole("checkbox", { name: "Hadiah" }) as HTMLInputElement;
    const before = toggle.checked;
    fireEvent.click(toggle);
    const stored = InvitationSchema.parse(JSON.parse(view.container.querySelector<HTMLInputElement>('input[name="invitation"]')!.value));
    expect((stored.content.moduleState as Record<string, { enabled: boolean }>).gift.enabled).toBe(!before);
    expect(screen.getByRole("heading", { name: "Informasi hadiah" })).toBeInTheDocument();
  });

  it("disables template switching outside draft", () => {
    const published = InvitationSchema.parse(invitations[1]);
    render(<InvitationEditorClient initialInvitation={published} templates={TemplatesSchema.parse(templates)} themes={InvitationThemesSchema.parse(themes)} routeSlug="dara-dan-bima" />);
    const section = screen.getByRole("heading", { name: "Ganti template" }).closest("section")!;
    expect(within(section).getByRole("button", { name: "Ganti template" })).toBeDisabled();
  });

  it("preserves unsupported data without asking for destructive confirmation", () => {
    const source = InvitationSchema.parse(invitations[0]);
    const invitation = InvitationSchema.parse({ ...source, content: { ...source.content, sourceOnly: "akan dibuang" } });
    render(<InvitationEditorClient initialInvitation={invitation} templates={TemplatesSchema.parse(templates)} themes={InvitationThemesSchema.parse(themes)} routeSlug="raka-dan-sinta-draft" />);
    fireEvent.change(screen.getByLabelText("Template tujuan"), { target: { value: "elegant-gold@1" } });
    expect(screen.queryByRole("checkbox", { name: /Konfirmasi pembuangan/ })).not.toBeInTheDocument();
    expect(screen.getByText(/tetap disimpan sebagai modul tidak aktif/)).toBeInTheDocument();
  });

  it("updates the live preview theme immediately without changing invitation content", () => {
    const invitation = InvitationSchema.parse(invitations[0]);
    const view = render(<InvitationEditorClient initialInvitation={invitation} templates={TemplatesSchema.parse(templates)} themes={InvitationThemesSchema.parse(themes)} routeSlug="raka-dan-sinta-draft" />);
    const initialContent = structuredClone(invitation.content);
    fireEvent.click(screen.getByRole("button", { name: "Preview langsung" }));
    expect(view.container.querySelector('[data-template="minimal-white@1"]')).toHaveAttribute("data-theme", "minimal-white-default@1");
    const themeSelect = [...view.container.querySelectorAll("select")].find((select) => select.querySelector('option[value="minimal-white-sage@1"]'))!;
    fireEvent.change(themeSelect, { target: { value: "minimal-white-sage@1" } });
    expect(view.container.querySelector('[data-template="minimal-white@1"]')).toHaveAttribute("data-theme", "minimal-white-sage@1");
    const serialized = view.container.querySelector<HTMLInputElement>('input[name="invitation"]')?.value ?? "{}";
    expect(InvitationSchema.parse(JSON.parse(serialized)).content).toEqual(initialContent);
    fireEvent.click(screen.getByRole("button", { name: "Tutup preview" }));
    expect(screen.queryByRole("dialog", { name: "Preview undangan langsung" })).not.toBeInTheDocument();
  });

  it("edits shared music independently from theme tokens", () => {
    const invitation = InvitationSchema.parse(invitations[0]);
    const view = render(<InvitationEditorClient initialInvitation={invitation} templates={TemplatesSchema.parse(templates)} themes={InvitationThemesSchema.parse(themes)} routeSlug="raka-dan-sinta-draft" />);
    fireEvent.change(screen.getByLabelText("Track"), { target: { value: "none" } });
    fireEvent.change(screen.getByLabelText("Volume awal (0–100%)"), { target: { value: "20" } });
    const serialized = view.container.querySelector<HTMLInputElement>('input[name="invitation"]')?.value ?? "{}";
    const stored = InvitationSchema.parse(JSON.parse(serialized));
    expect((stored.content.modules as Record<string, Record<string, unknown>>).music).toMatchObject({ trackId: "none", volume: 0.2 });
    expect(stored.themeKey).toBe(invitation.themeKey);
  });

  it("selects custom audio for the existing music controller and defers delete until save", () => {
    const source = InvitationSchema.parse(invitations[0]);
    const content = parseTemplateContent("wedding-default", 1, source.contentSchemaVersion, source.content);
    const mediaId = "7ab6d9dc-73ef-4da8-8e70-713a0cc53b30";
    content.modules.music = { trackId: "custom", mediaId, title: "Lagu kami", startAtSeconds: 0, volume: 0.35, loop: true };
    const invitation = InvitationSchema.parse({ ...source, templateKey: "wedding-default", templateVersion: 1, themeKey: "wedding-default-default", themeVersion: 1, contentSchemaVersion: 2, content });
    const audio: InvitationAudioMedia = { kind: "audio", id: mediaId, invitationId: invitation.id, purpose: "invitation_music", originalFilename: "lagu-kami.mp3", mimeType: "audio/mpeg", sizeBytes: 2048, durationMs: 90_000, status: "ready", createdAt: "2026-08-28T00:00:00.000Z" };
    const view = render(<InvitationEditorClient initialInvitation={invitation} initialMedia={[audio]} templates={TemplatesSchema.parse(templates)} themes={InvitationThemesSchema.parse(themes)} routeSlug="raka-dan-sinta-draft" />);
    expect(screen.getByText("lagu-kami.mp3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview langsung" }));
    expect(view.container.querySelector("audio")).toHaveAttribute("src", `/api/public-audio/${mediaId}`);
    fireEvent.click(screen.getByRole("button", { name: "Tutup preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Hapus custom audio" }));
    const stored = InvitationSchema.parse(JSON.parse(view.container.querySelector<HTMLInputElement>('input[name="invitation"]')!.value));
    expect((stored.content.modules as Record<string, Record<string, unknown>>).music).toMatchObject({ trackId: "ambient-soft", mediaId: "" });
    expect(JSON.parse(view.container.querySelector<HTMLInputElement>('input[name="deleteMediaIds"]')!.value)).toEqual([mediaId]);
  });
});
