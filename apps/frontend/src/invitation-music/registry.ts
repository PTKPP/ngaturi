import { z } from "zod";

export const InvitationMusicTrackIdSchema = z.enum(["none", "ambient-soft"]);
export type InvitationMusicTrackId = z.infer<typeof InvitationMusicTrackIdSchema>;

export const InvitationMusicSchema = z.object({
  trackId: InvitationMusicTrackIdSchema,
  title: z.string().trim().max(80),
  startAtSeconds: z.number().min(0).max(300),
  volume: z.number().min(0).max(1),
  loop: z.boolean(),
});
export type InvitationMusic = z.infer<typeof InvitationMusicSchema>;

const musicTrackRegistry: Readonly<Record<Exclude<InvitationMusicTrackId, "none">, { source: string; title: string }>> = {
  "ambient-soft": { source: "/invitation-music/ambient-soft.wav", title: "Ambient lembut" },
};

export function resolveInvitationMusic(value: InvitationMusic): (InvitationMusic & { source: string }) | null {
  if (value.trackId === "none") return null;
  const track = musicTrackRegistry[value.trackId];
  return { ...value, title: value.title || track.title, source: track.source };
}
