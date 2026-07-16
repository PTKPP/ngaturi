import { InvitationSchema, type Invitation, type Session } from "@/domain";
import type { InvitationRepository, TemplateRepository } from "@/repositories/contracts";
import { assertAllowedSlug, normalizeSlug, RESERVED_SLUGS } from "./slug";

export type InvitationDraftInput = Pick<Invitation, "title" | "slug" | "templateKey" | "templateVersion">;

export class InvitationService {
  constructor(private readonly invitations: InvitationRepository, private readonly templates: TemplateRepository) {}

  listOwned(session: Session): Invitation[] { return this.invitations.list().filter((item) => item.ownerId === session.userId); }
  getOwned(session: Session, id: string): Invitation {
    const invitation = this.invitations.findById(id);
    if (!invitation || invitation.ownerId !== session.userId) throw new Error("Undangan tidak ditemukan atau bukan milik Anda.");
    return invitation;
  }
  findPublished(slug: string): Invitation | null {
    const invitation = this.invitations.findBySlug(slug);
    return invitation?.status === "published" ? invitation : null;
  }
  create(session: Session, input: InvitationDraftInput): Invitation {
    const slug = this.validateSlug(input.slug);
    this.assertUniqueSlug(slug);
    this.assertActiveTemplate(input.templateKey, input.templateVersion);
    const now = new Date().toISOString();
    const id = `inv_${session.userId}_${Date.now()}`;
    return this.invitations.create(InvitationSchema.parse({
      id, ownerId: session.userId, slug, title: input.title.trim(), templateKey: input.templateKey,
      templateVersion: input.templateVersion, status: "draft",
      couple: {
        partnerOne: { fullName: "Partner Satu", nickname: "Satu", parentNames: [], photo: "" },
        partnerTwo: { fullName: "Partner Dua", nickname: "Dua", parentNames: [], photo: "" },
      },
      events: [{ id: `${id}_event_1`, type: "reception", title: "Acara", date: "2026-12-01", startTime: "10:00", endTime: "12:00", timezone: "Asia/Jakarta", venueName: "Lokasi Acara", address: "Alamat acara", mapUrl: "", sortOrder: 0 }],
      content: { openingText: "Dengan bahagia kami mengundang Anda.", quote: "", story: "", closingText: "Terima kasih atas doa dan kehadiran Anda.", giftInformation: "" },
      gallery: [], settings: { showGiftInformation: false }, createdAt: now, updatedAt: now,
    }));
  }
  update(session: Session, next: Invitation): Invitation {
    const current = this.getOwned(session, next.id);
    if (next.ownerId !== current.ownerId) throw new Error("Pemilik undangan tidak boleh diubah.");
    const slug = this.validateSlug(next.slug);
    this.assertUniqueSlug(slug, next.id);
    this.assertActiveTemplate(next.templateKey, next.templateVersion);
    return this.invitations.update(InvitationSchema.parse({ ...next, slug, updatedAt: new Date().toISOString() }));
  }
  publish(session: Session, id: string): Invitation { return this.setStatus(session, id, "published"); }
  unpublish(session: Session, id: string): Invitation { return this.setStatus(session, id, "inactive"); }
  private setStatus(session: Session, id: string, status: Invitation["status"]): Invitation {
    return this.update(session, { ...this.getOwned(session, id), status });
  }
  private validateSlug(value: string): string {
    const raw = value.trim().toLowerCase();
    if (raw.includes("&")) throw new Error("Slug tidak boleh menggunakan karakter &.");
    if (RESERVED_SLUGS.has(raw)) throw new Error("Slug tersebut dicadangkan oleh aplikasi.");
    const slug = normalizeSlug(raw);
    assertAllowedSlug(slug);
    return slug;
  }
  private assertUniqueSlug(slug: string, exceptId?: string): void {
    const duplicate = this.invitations.findBySlug(slug);
    if (duplicate && duplicate.id !== exceptId) throw new Error("Slug sudah digunakan undangan lain.");
  }
  private assertActiveTemplate(key: string, version: number): void {
    const template = this.templates.find(key, version);
    if (!template || template.status !== "active") throw new Error("Template tidak tersedia.");
  }
}
