import { z } from "zod";
import { InvitationMusicSchema } from "@/invitation-music/registry";
import { MediaReferenceSchema, OptionalUrlSchema } from "../schemas";
import { defineModule, stable } from "./shared";

const gallerySchema = z.object({ items: z.array(MediaReferenceSchema) });
const urlSchema = z.object({ url: OptionalUrlSchema });

export const mediaModuleDefinitions = {
  gallery: defineModule({ id: "gallery", name: "Galeri", schema: gallerySchema, createDefault: () => ({ items: [] }), migrate: stable(gallerySchema), editor: "media-list" }),
  video: defineModule({ id: "video", name: "Video", schema: urlSchema, createDefault: () => ({ url: "" }), migrate: stable(urlSchema), editor: "configuration" }),
  livestream: defineModule({ id: "livestream", name: "Livestream", schema: urlSchema, createDefault: () => ({ url: "" }), migrate: stable(urlSchema), editor: "configuration" }),
  music: defineModule({ id: "music", name: "Musik latar", schema: InvitationMusicSchema, createDefault: () => ({ trackId: "ambient-soft", title: "Ambient lembut", startAtSeconds: 0, volume: 0.35, loop: true }), migrate: stable(InvitationMusicSchema), editor: "configuration" }),
} as const;
