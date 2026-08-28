import { z } from "zod";

export const RsvpAttendanceStatusSchema = z.enum(["attending", "not_attending"]);
export type RsvpAttendanceStatus = z.infer<typeof RsvpAttendanceStatusSchema>;

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");

export const GuestRsvpSubmissionSchema = z.object({
  invitationId: z.string().uuid(),
  clientSubmissionId: z.string().uuid(),
  guestName: z.string().max(300).transform(normalizeWhitespace).pipe(z.string().min(2).max(100)),
  attendanceStatus: RsvpAttendanceStatusSchema,
  guestCount: z.number().int().min(0).max(10),
  note: z.string().max(1000).transform(normalizeWhitespace).pipe(z.string().max(500)).default(""),
  website: z.string().max(0).default(""),
}).superRefine((value, context) => {
  if (value.attendanceStatus === "attending" && value.guestCount < 1) {
    context.addIssue({ code: "custom", path: ["guestCount"], message: "Jumlah tamu minimal 1 jika hadir." });
  }
  if (value.attendanceStatus === "not_attending" && value.guestCount !== 0) {
    context.addIssue({ code: "custom", path: ["guestCount"], message: "Jumlah tamu harus 0 jika tidak hadir." });
  }
});

export type GuestRsvpSubmission = z.infer<typeof GuestRsvpSubmissionSchema>;
