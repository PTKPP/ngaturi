import { z } from "zod";

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID_PATTERN = /^\d{6,12}$/;
const MAX_EXTERNAL_URL_LENGTH = 1_000;

export const VideoProviderSchema = z.enum(["youtube", "vimeo"]);
export type VideoProvider = z.infer<typeof VideoProviderSchema>;

export type NormalizedVideo = {
  provider: VideoProvider;
  videoId: string;
};

export const EmptyVideoModuleSchema = z.object({
  provider: z.literal("none"),
  videoId: z.literal(""),
  embedEnabled: z.literal(false),
  legacyUnsupportedUrl: z.union([
    z.literal(""),
    z.string().max(MAX_EXTERNAL_URL_LENGTH).url().refine((value) => value.startsWith("https://"), "Legacy URL harus menggunakan HTTPS."),
  ]).default(""),
});

export const VideoModuleSchema = z.discriminatedUnion("provider", [
  EmptyVideoModuleSchema,
  z.object({ provider: z.literal("youtube"), videoId: z.string().regex(YOUTUBE_ID_PATTERN), embedEnabled: z.boolean(), legacyUnsupportedUrl: z.literal("").default("") }),
  z.object({ provider: z.literal("vimeo"), videoId: z.string().regex(VIMEO_ID_PATTERN), embedEnabled: z.boolean(), legacyUnsupportedUrl: z.literal("").default("") }),
]);
export type VideoModule = z.infer<typeof VideoModuleSchema>;

export const DEFAULT_VIDEO_MODULE: VideoModule = {
  provider: "none",
  videoId: "",
  embedEnabled: false,
  legacyUnsupportedUrl: "",
};

function safeHttpsUrl(rawUrl: string): URL | null {
  const value = rawUrl.trim();
  if (!value || value.length > MAX_EXTERNAL_URL_LENGTH || /[<>]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

export function normalizeVideoUrl(rawUrl: string): NormalizedVideo | null {
  const url = safeHttpsUrl(rawUrl);
  if (!url) return null;
  const hostname = url.hostname.toLowerCase();
  let videoId = "";

  if (hostname === "youtu.be") videoId = url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com"].includes(hostname)) {
    const parts = url.pathname.split("/").filter(Boolean);
    videoId = url.searchParams.get("v") ?? (["embed", "shorts", "live"].includes(parts[0] ?? "") ? parts[1] ?? "" : "");
  }
  if (YOUTUBE_ID_PATTERN.test(videoId)) return { provider: "youtube", videoId };

  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(hostname)) {
    const parts = url.pathname.split("/").filter(Boolean);
    videoId = parts[0] === "video" ? parts[1] ?? "" : parts[0] ?? "";
    if (VIMEO_ID_PATTERN.test(videoId)) return { provider: "vimeo", videoId };
  }
  return null;
}

export function videoExternalUrl(video: Pick<NormalizedVideo, "provider" | "videoId">): string {
  return video.provider === "youtube"
    ? `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`
    : `https://vimeo.com/${encodeURIComponent(video.videoId)}`;
}

export function videoEmbedUrl(video: Pick<NormalizedVideo, "provider" | "videoId">): string {
  return video.provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.videoId)}?rel=0`
    : `https://player.vimeo.com/video/${encodeURIComponent(video.videoId)}?dnt=1`;
}

export const MapProviderSchema = z.enum(["google_maps", "openstreetmap"]);
export type MapProvider = z.infer<typeof MapProviderSchema>;
export type NormalizedMap = { provider: MapProvider; canonicalUrl: string };

function canonicalGoogleMapsUrl(url: URL): string | null {
  const hostname = url.hostname.toLowerCase();
  if (["maps.app.goo.gl"].includes(hostname)) {
    return url.pathname !== "/" ? `https://maps.app.goo.gl${url.pathname}` : null;
  }
  if (hostname === "goo.gl") {
    return url.pathname.startsWith("/maps/") ? `https://goo.gl${url.pathname}` : null;
  }
  if (!["google.com", "www.google.com", "maps.google.com"].includes(hostname)) return null;
  if (!url.pathname.startsWith("/maps") && hostname !== "maps.google.com") return null;
  for (const key of [...url.searchParams.keys()]) {
    if (/^(?:utm_|entry$|authuser$)/i.test(key)) url.searchParams.delete(key);
  }
  const path = hostname === "maps.google.com" && url.pathname === "/" ? "/maps" : url.pathname;
  return `https://www.google.com${path}${url.search}${url.hash}`;
}

export function normalizeMapUrl(rawUrl: string): NormalizedMap | null {
  const url = safeHttpsUrl(rawUrl);
  if (!url) return null;
  const googleUrl = canonicalGoogleMapsUrl(url);
  if (googleUrl) return { provider: "google_maps", canonicalUrl: googleUrl };
  if (["openstreetmap.org", "www.openstreetmap.org"].includes(url.hostname.toLowerCase())) {
    return { provider: "openstreetmap", canonicalUrl: `https://www.openstreetmap.org${url.pathname}${url.search}${url.hash}` };
  }
  return null;
}

export const SupportedMapUrlSchema = z.union([
  z.literal(""),
  z.string().transform((value, context) => {
    const normalized = normalizeMapUrl(value);
    if (!normalized) {
      context.addIssue({ code: "custom", message: "Gunakan URL Google Maps atau OpenStreetMap HTTPS yang didukung." });
      return z.NEVER;
    }
    return normalized.canonicalUrl;
  }),
]);

export function mapEmbedUrl(address: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address.trim())}&output=embed`;
}

export const MapsModuleSchema = z.object({
  label: z.string().trim().min(1).max(40),
  embedEnabled: z.boolean(),
});
export type MapsModule = z.infer<typeof MapsModuleSchema>;
