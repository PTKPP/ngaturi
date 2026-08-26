import { z } from "zod";

const OptionalUrlSchema = z.union([z.literal(""), z.string().url()]);
const TimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Waktu harus menggunakan format 24 jam HH:MM.");
const MediaReferenceSchema = z.string().refine((value) => value === "" || value.startsWith("/templates/") || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value), "Media harus berupa ID Storage atau aset template lokal.");

export const PartnerSchema = z.object({
  fullName: z.string().trim().min(1),
  nickname: z.string().trim().min(1),
  parentNames: z.array(z.string().trim().min(1)),
  photo: MediaReferenceSchema,
});

export const EventSchema = z.object({
  id: z.string().min(1), type: z.string().trim().min(1), title: z.string().trim().min(1),
  date: z.string().date(), startTime: TimeSchema, endTime: TimeSchema,
  timezone: z.string().trim().min(1), venueName: z.string().trim().min(1),
  address: z.string().trim().min(1), mapUrl: OptionalUrlSchema,
  sortOrder: z.number().int().nonnegative(),
}).superRefine((event, context) => {
  if (event.endTime <= event.startTime) context.addIssue({ code: "custom", path: ["endTime"], message: "Waktu selesai harus setelah waktu mulai." });
});

export const InvitationEventsSchema = z.array(EventSchema).min(1).superRefine((events, context) => {
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const [index, event] of events.entries()) {
    if (ids.has(event.id)) context.addIssue({ code: "custom", path: [index, "id"], message: "ID acara harus unik." });
    if (orders.has(event.sortOrder)) context.addIssue({ code: "custom", path: [index, "sortOrder"], message: "Urutan acara harus unik." });
    ids.add(event.id); orders.add(event.sortOrder);
  }
  const actual = [...orders].sort((a, b) => a - b);
  if (actual.some((value, index) => value !== index)) context.addIssue({ code: "custom", message: "Urutan acara harus berurutan mulai dari 0." });
});

export const WeddingContentSchema = z.object({
  couple: z.object({ partnerOne: PartnerSchema, partnerTwo: PartnerSchema }),
  events: InvitationEventsSchema,
  copy: z.object({ openingText: z.string(), quote: z.string(), story: z.string(), closingText: z.string(), giftInformation: z.string() }),
  gallery: z.array(MediaReferenceSchema),
  settings: z.object({ showGiftInformation: z.boolean() }),
});

export type Partner = z.infer<typeof PartnerSchema>;
export type InvitationEvent = z.infer<typeof EventSchema>;
export type WeddingContent = z.infer<typeof WeddingContentSchema>;
