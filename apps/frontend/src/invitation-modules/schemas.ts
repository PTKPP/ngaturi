import { z } from "zod";
import { SupportedMapUrlSchema } from "./definitions/external-embeds";

export const OptionalUrlSchema = z.union([z.literal(""), z.string().url()]);
export const TimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Waktu harus menggunakan format 24 jam HH:MM.");
export const MediaReferenceSchema = z.string().refine((value) => value === "" || value.startsWith("/templates/") || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value), "Media harus berupa ID Storage atau aset template lokal.");

export const PartnerSchema = z.object({
  fullName: z.string().trim().min(1),
  nickname: z.string().trim().min(1),
  parentNames: z.array(z.string().trim().min(1)),
  photo: MediaReferenceSchema,
});

const EventCoreSchema = z.object({
  id: z.string().min(1), type: z.string().trim().min(1), title: z.string().trim().min(1),
  date: z.string().date(), startTime: TimeSchema, endTime: TimeSchema,
  timezone: z.string().trim().min(1), venueName: z.string().trim().min(1),
  address: z.string().trim().min(1),
  sortOrder: z.number().int().nonnegative(),
});

function validateEventTime(event: { startTime: string; endTime: string }, context: z.RefinementCtx) {
  if (event.endTime <= event.startTime) context.addIssue({ code: "custom", path: ["endTime"], message: "Waktu selesai harus setelah waktu mulai." });
}

export const LegacyEventSchema = EventCoreSchema.extend({ mapUrl: OptionalUrlSchema }).superRefine(validateEventTime);

export const EventSchema = EventCoreSchema.extend({
  mapUrl: SupportedMapUrlSchema,
  legacyUnsupportedMapUrl: z.union([z.literal(""), z.string().max(1_000).url().refine((value) => value.startsWith("https://"))]).optional(),
}).superRefine(validateEventTime);

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

export const LegacyInvitationEventsSchema = z.array(LegacyEventSchema).min(1);

const WeddingCopySchema = z.object({ openingText: z.string(), quote: z.string(), story: z.string(), closingText: z.string(), giftInformation: z.string() });
const WeddingSettingsSchema = z.object({ showGiftInformation: z.boolean() });

export const LegacyWeddingContentV1Schema = z.object({
  couple: z.object({ partnerOne: PartnerSchema, partnerTwo: PartnerSchema }),
  events: LegacyInvitationEventsSchema,
  copy: WeddingCopySchema,
  gallery: z.array(MediaReferenceSchema),
  settings: WeddingSettingsSchema,
});

export const WeddingRenderModelSchema = z.object({
  couple: z.object({ partnerOne: PartnerSchema, partnerTwo: PartnerSchema }),
  events: InvitationEventsSchema,
  copy: WeddingCopySchema,
  gallery: z.array(MediaReferenceSchema),
  settings: WeddingSettingsSchema,
});

export type Partner = z.infer<typeof PartnerSchema>;
export type InvitationEvent = z.infer<typeof EventSchema>;
export type WeddingRenderModel = z.infer<typeof WeddingRenderModelSchema>;
