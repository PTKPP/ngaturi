import { z } from "zod";

const OptionalUrlSchema = z.union([z.literal(""), z.string().url()]);

export const PartnerSchema = z.object({
  fullName: z.string().min(1),
  nickname: z.string().min(1),
  parentNames: z.array(z.string()),
  photo: z.string(),
});

export const EventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1),
  date: z.string().date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  venueName: z.string().min(1),
  address: z.string().min(1),
  mapUrl: OptionalUrlSchema,
  sortOrder: z.number().int().nonnegative(),
});

export const InvitationStatusSchema = z.enum(["draft", "published", "inactive"]);
export const InvitationSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  templateKey: z.string().min(1),
  templateVersion: z.number().int().positive(),
  status: InvitationStatusSchema,
  couple: z.object({ partnerOne: PartnerSchema, partnerTwo: PartnerSchema }),
  events: z.array(EventSchema).min(1),
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
