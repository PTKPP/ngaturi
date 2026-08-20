import { z } from "zod";

const OptionalUrlSchema = z.union([z.literal(""), z.string().url()]);
const TimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Waktu harus menggunakan format 24 jam HH:MM.");

export const PartnerSchema = z.object({
  fullName: z.string().trim().min(1),
  nickname: z.string().trim().min(1),
  parentNames: z.array(z.string().trim().min(1)),
  photo: z.string().trim(),
});

export const EventSchema = z.object({
  id: z.string().min(1),
  type: z.string().trim().min(1),
  title: z.string().trim().min(1),
  date: z.string().date(),
  startTime: TimeSchema,
  endTime: TimeSchema,
  timezone: z.string().trim().min(1),
  venueName: z.string().trim().min(1),
  address: z.string().trim().min(1),
  mapUrl: OptionalUrlSchema,
  sortOrder: z.number().int().nonnegative(),
}).superRefine((event, context) => {
  if (event.endTime <= event.startTime) {
    context.addIssue({
      code: "custom",
      path: ["endTime"],
      message: "Waktu selesai harus setelah waktu mulai.",
    });
  }
});

export const InvitationEventsSchema = z.array(EventSchema).min(1).superRefine((events, context) => {
  const ids = new Set<string>();
  const sortOrders = new Set<number>();
  for (const [index, event] of events.entries()) {
    if (ids.has(event.id)) {
      context.addIssue({ code: "custom", path: [index, "id"], message: "ID acara harus unik." });
    }
    if (sortOrders.has(event.sortOrder)) {
      context.addIssue({ code: "custom", path: [index, "sortOrder"], message: "Urutan acara harus unik." });
    }
    ids.add(event.id);
    sortOrders.add(event.sortOrder);
  }
  const expected = events.map((_, index) => index);
  const actual = [...sortOrders].sort((left, right) => left - right);
  if (actual.some((value, index) => value !== expected[index])) {
    context.addIssue({ code: "custom", message: "Urutan acara harus berurutan mulai dari 0." });
  }
});

export const InvitationStatusSchema = z.enum(["draft", "published", "inactive"]);
export const InvitationSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  routeId: z.string().min(1),
  title: z.string().trim().min(1),
  templateKey: z.string().trim().min(1),
  templateVersion: z.number().int().positive(),
  themeKey: z.string().trim().min(1),
  themeVersion: z.number().int().positive(),
  status: InvitationStatusSchema,
  couple: z.object({ partnerOne: PartnerSchema, partnerTwo: PartnerSchema }),
  events: InvitationEventsSchema,
  content: z.object({
    openingText: z.string(),
    quote: z.string(),
    story: z.string(),
    closingText: z.string(),
    giftInformation: z.string(),
  }),
  gallery: z.array(z.string()),
  settings: z.object({ showGiftInformation: z.boolean() }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const InvitationsSchema = z.array(InvitationSchema);
export type Partner = z.infer<typeof PartnerSchema>;
export type InvitationEvent = z.infer<typeof EventSchema>;
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;
export type Invitation = z.infer<typeof InvitationSchema>;
