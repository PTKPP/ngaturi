import { z } from "zod";

export const InvitationMusicTrackIdSchema = z.enum(["none", "ambient-soft", "custom"]);
export type InvitationMusicTrackId = z.infer<typeof InvitationMusicTrackIdSchema>;

export const InvitationMusicSchema = z.object({
  trackId: InvitationMusicTrackIdSchema,
  mediaId: z.union([z.string().uuid(), z.literal("")]).default(""),
  title: z.string().trim().max(80),
  startAtSeconds: z.number().min(0).max(300),
  volume: z.number().min(0).max(1),
  loop: z.boolean(),
}).superRefine((value, context) => {
  if (value.trackId === "custom" && !value.mediaId) context.addIssue({ code: "custom", path: ["mediaId"], message: "Custom audio memerlukan media ID." });
  if (value.trackId !== "custom" && value.mediaId) context.addIssue({ code: "custom", path: ["mediaId"], message: "Media ID hanya valid untuk custom audio." });
});
export type InvitationMusic = z.infer<typeof InvitationMusicSchema>;

const musicTrackRegistry: Readonly<Record<Exclude<InvitationMusicTrackId, "none" | "custom">, { source: string; title: string }>> = {
  "ambient-soft": { source: "/invitation-music/ambient-soft.wav", title: "Ambient lembut" },
};

export function resolveInvitationMusic(value: InvitationMusic): (InvitationMusic & { source: string }) | null {
  if (value.trackId === "none") return null;
  if (value.trackId === "custom") return { ...value, source: `/api/public-audio/${value.mediaId}` };
  const track = musicTrackRegistry[value.trackId];
  return { ...value, title: value.title || track.title, source: track.source };
}
