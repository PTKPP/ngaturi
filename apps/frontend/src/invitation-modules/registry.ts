import { z } from "zod";
import type { InvitationModuleDefinition, InvitationModuleId } from "./types";
import { InvitationEventsSchema, MediaReferenceSchema, OptionalUrlSchema, PartnerSchema } from "./schemas";

const textSchema = z.object({ text: z.string() });
const configSchema = z.object({ enabled: z.boolean().default(true) });
const profileSchema = z.object({ fullName: z.string().trim().min(1), nickname: z.string().trim().min(1), photo: MediaReferenceSchema });

function definition<T>(value: Omit<InvitationModuleDefinition<T>, "version">): InvitationModuleDefinition<T> { return { ...value, version: 1 }; }
function stable<T>(schema: z.ZodType<T>) { return (version: number, value: unknown) => { if (version !== 1) throw new Error(`Versi modul ${version} tidak didukung.`); return schema.parse(value); }; }
function textModule(id: InvitationModuleId, name: string, defaultText: string, editor: "text" | "long-text" = "long-text") {
  return definition({ id, name, schema: textSchema, createDefault: () => ({ text: defaultText }), migrate: stable(textSchema), editor });
}

export const moduleRegistry = {
  cover: definition({ id: "cover", name: "Sampul", schema: z.object({ eyebrow: z.string(), title: z.string() }), createDefault: () => ({ eyebrow: "Undangan", title: "Hari Bahagia Kami" }), migrate: stable(z.object({ eyebrow: z.string(), title: z.string() })), editor: "configuration" }),
  greeting: textModule("greeting", "Salam pembuka", "Dengan bahagia kami mengundang Anda."),
  "couple-profile": definition({ id: "couple-profile", name: "Profil pasangan", schema: z.object({ partnerOne: PartnerSchema, partnerTwo: PartnerSchema }), createDefault: () => ({ partnerOne: { fullName: "Partner Satu", nickname: "Satu", parentNames: [], photo: "" }, partnerTwo: { fullName: "Partner Dua", nickname: "Dua", parentNames: [], photo: "" } }), migrate: stable(z.object({ partnerOne: PartnerSchema, partnerTwo: PartnerSchema })), editor: "couple-profile" }),
  "child-profile": definition({ id: "child-profile", name: "Profil anak", schema: profileSchema, createDefault: () => ({ fullName: "Nama Anak", nickname: "Anak", photo: "" }), migrate: stable(profileSchema), editor: "configuration" }),
  parents: definition({ id: "parents", name: "Orang tua", schema: z.object({ names: z.array(z.string().trim().min(1)) }), createDefault: () => ({ names: [] }), migrate: stable(z.object({ names: z.array(z.string().trim().min(1)) })), editor: "configuration" }),
  quote: textModule("quote", "Kutipan", ""),
  event: definition({ id: "event", name: "Acara", schema: z.object({ items: InvitationEventsSchema }), createDefault: () => ({ items: [{ id: "event-1", type: "reception", title: "Acara", date: "2026-12-01", startTime: "10:00", endTime: "12:00", timezone: "Asia/Jakarta", venueName: "Lokasi Acara", address: "Alamat acara", mapUrl: "", sortOrder: 0 }] }), migrate: stable(z.object({ items: InvitationEventsSchema })), editor: "event-list" }),
  countdown: definition({ id: "countdown", name: "Hitung mundur", schema: z.object({ label: z.string() }), createDefault: () => ({ label: "Menuju hari bahagia" }), migrate: stable(z.object({ label: z.string() })), editor: "configuration" }),
  "love-story": textModule("love-story", "Cerita", ""),
  "birth-info": definition({ id: "birth-info", name: "Informasi kelahiran", schema: z.object({ date: z.string(), place: z.string(), weight: z.string(), length: z.string() }), createDefault: () => ({ date: "", place: "", weight: "", length: "" }), migrate: stable(z.object({ date: z.string(), place: z.string(), weight: z.string(), length: z.string() })), editor: "configuration" }),
  speaker: definition({ id: "speaker", name: "Pembicara", schema: z.object({ items: z.array(z.object({ name: z.string(), role: z.string(), photo: MediaReferenceSchema })) }), createDefault: () => ({ items: [] }), migrate: stable(z.object({ items: z.array(z.object({ name: z.string(), role: z.string(), photo: MediaReferenceSchema })) })), editor: "configuration" }),
  agenda: definition({ id: "agenda", name: "Agenda", schema: z.object({ items: z.array(z.object({ time: z.string(), title: z.string() })) }), createDefault: () => ({ items: [] }), migrate: stable(z.object({ items: z.array(z.object({ time: z.string(), title: z.string() })) })), editor: "configuration" }),
  gallery: definition({ id: "gallery", name: "Galeri", schema: z.object({ items: z.array(MediaReferenceSchema) }), createDefault: () => ({ items: [] }), migrate: stable(z.object({ items: z.array(MediaReferenceSchema) })), editor: "media-list" }),
  video: definition({ id: "video", name: "Video", schema: z.object({ url: OptionalUrlSchema }), createDefault: () => ({ url: "" }), migrate: stable(z.object({ url: OptionalUrlSchema })), editor: "configuration" }),
  rsvp: definition({ id: "rsvp", name: "RSVP", schema: configSchema, createDefault: () => ({ enabled: true }), migrate: stable(configSchema), editor: "configuration" }),
  gift: textModule("gift", "Hadiah", ""),
  wishes: definition({ id: "wishes", name: "Ucapan", schema: configSchema, createDefault: () => ({ enabled: true }), migrate: stable(configSchema), editor: "configuration" }),
  maps: definition({ id: "maps", name: "Peta", schema: z.object({ label: z.string() }), createDefault: () => ({ label: "Buka peta" }), migrate: stable(z.object({ label: z.string() })), editor: "configuration" }),
  "qr-check-in": definition({ id: "qr-check-in", name: "QR check-in", schema: configSchema, createDefault: () => ({ enabled: true }), migrate: stable(configSchema), editor: "configuration" }),
  livestream: definition({ id: "livestream", name: "Livestream", schema: z.object({ url: OptionalUrlSchema }), createDefault: () => ({ url: "" }), migrate: stable(z.object({ url: OptionalUrlSchema })), editor: "configuration" }),
  closing: textModule("closing", "Penutup", "Terima kasih atas doa dan kehadiran Anda."),
} satisfies Record<InvitationModuleId, InvitationModuleDefinition>;

export function getInvitationModule(id: string): InvitationModuleDefinition | null { return moduleRegistry[id as InvitationModuleId] ?? null; }

const registeredModuleIds = new Set<string>();
for (const [key, definitionValue] of Object.entries(moduleRegistry)) {
  if (key !== definitionValue.id) throw new Error(`Key registry modul tidak cocok: ${key}.`);
  if (registeredModuleIds.has(definitionValue.id)) throw new Error(`Modul duplikat: ${definitionValue.id}.`);
  registeredModuleIds.add(definitionValue.id);
}
