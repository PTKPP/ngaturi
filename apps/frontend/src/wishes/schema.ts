import { z } from "zod";

export const WishStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type WishStatus = z.infer<typeof WishStatusSchema>;

export const WishModerationStatusSchema = z.enum(["approved", "rejected"]);
export type WishModerationStatus = z.infer<typeof WishModerationStatusSchema>;

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");
const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const normalizedText = (rawMax: number, min: number, max: number) => z.string()
  .max(rawMax)
  .refine((value) => !controlCharacters.test(value), "Teks memuat karakter yang tidak didukung.")
  .transform(normalizeWhitespace)
  .pipe(z.string().min(min).max(max));

export const GuestWishSubmissionSchema = z.object({
  invitationId: z.string().uuid(),
  clientSubmissionId: z.string().uuid(),
  guestName: normalizedText(300, 2, 100),
  message: normalizedText(3000, 2, 1000),
  website: z.string().max(0).default(""),
});

export const PublicWishListSchema = z.object({
  invitationId: z.string().uuid(),
  cursor: z.object({ createdAt: z.string().datetime({ offset: true }), id: z.string().uuid() }).nullable().default(null),
});

export const OwnedWishListSchema = z.object({
  invitationId: z.string().uuid(),
  status: WishStatusSchema,
  offset: z.number().int().min(0).max(100000).default(0),
});

export const ModerateWishSchema = z.object({
  invitationId: z.string().uuid(),
  wishId: z.string().uuid(),
  status: WishModerationStatusSchema,
  expectedUpdatedAt: z.string().datetime({ offset: true }),
});

export type GuestWishSubmission = z.infer<typeof GuestWishSubmissionSchema>;

export interface PublicWishRecord {
  id: string;
  guestName: string;
  message: string;
  createdAt: string;
}
