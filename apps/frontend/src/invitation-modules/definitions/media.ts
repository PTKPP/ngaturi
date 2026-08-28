import { z } from "zod";
import { InvitationMusicSchema } from "@/invitation-music/registry";
import { MediaReferenceSchema, OptionalUrlSchema } from "../schemas";
import { defineModule, stable } from "./shared";
import { DEFAULT_VIDEO_MODULE, normalizeVideoUrl, VideoModuleSchema } from "./external-embeds";

const gallerySchema = z.object({ items: z.array(MediaReferenceSchema) });
const urlSchema = z.object({ url: OptionalUrlSchema });
const legacyVideoSchema = z.object({ url: OptionalUrlSchema });

function migrateVideo(version: number, value: unknown) {
  if (version === 2) return VideoModuleSchema.parse(value);
  if (version !== 1) throw new Error(`Versi modul video ${version} tidak didukung.`);
  const legacy = legacyVideoSchema.parse(value);
  if (!legacy.url) return DEFAULT_VIDEO_MODULE;
  const normalized = normalizeVideoUrl(legacy.url);
  if (normalized) return VideoModuleSchema.parse({ ...normalized, embedEnabled: true, legacyUnsupportedUrl: "" });
  return VideoModuleSchema.parse({ ...DEFAULT_VIDEO_MODULE, legacyUnsupportedUrl: legacy.url });
}

export const mediaModuleDefinitions = {
  gallery: defineModule({ id: "gallery", name: "Galeri", schema: gallerySchema, createDefault: () => ({ items: [] }), migrate: stable(gallerySchema), editor: "media-list" }),
  video: defineModule({ id: "video", version: 2, name: "Video", schema: VideoModuleSchema, createDefault: () => ({ ...DEFAULT_VIDEO_MODULE }), migrate: migrateVideo, editor: "configuration" }),
  livestream: defineModule({ id: "livestream", name: "Livestream", schema: urlSchema, createDefault: () => ({ url: "" }), migrate: stable(urlSchema), editor: "configuration" }),
  music: defineModule({ id: "music", name: "Musik latar", schema: InvitationMusicSchema, createDefault: () => ({ trackId: "ambient-soft", mediaId: "", title: "Ambient lembut", startAtSeconds: 0, volume: 0.35, loop: true }), migrate: stable(InvitationMusicSchema), editor: "configuration" }),
} as const;
