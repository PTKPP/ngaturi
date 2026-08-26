import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import invitations from "../../../contracts/dummy-data/invitations.json";
import templates from "../../../contracts/dummy-data/templates.json";
import themes from "../../../contracts/dummy-data/themes.json";
import { InvitationSchema, TemplatesSchema, InvitationThemesSchema } from "@/domain";
import { toWeddingRenderModel } from "@/invitation-modules/content";

vi.mock("@/app/actions/invitations", () => ({ saveInvitationAction: vi.fn(), switchTemplateAction: vi.fn() }));

import { InvitationEditorClient } from "@/components/InvitationEditorClient";

describe("generic template editor routing", () => {
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
});
