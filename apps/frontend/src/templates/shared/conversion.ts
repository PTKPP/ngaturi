import { WeddingContentSchema, type WeddingContent } from "./content-schema";
import type { ContentConversion } from "@/templates/types";

const COMPATIBLE_FIELDS = new Set(["couple", "events", "copy", "gallery", "settings"]);

export function convertWeddingContent(source: unknown, defaults: WeddingContent): ContentConversion<WeddingContent> {
  const record = source && typeof source === "object" && !Array.isArray(source) ? source as Record<string, unknown> : {};
  const discardedFields = Object.keys(record).filter((key) => !COMPATIBLE_FIELDS.has(key));
  return {
    content: WeddingContentSchema.parse({
      couple: record.couple ?? defaults.couple, events: record.events ?? defaults.events,
      copy: record.copy ?? defaults.copy, gallery: record.gallery ?? defaults.gallery,
      settings: record.settings ?? defaults.settings,
    }),
    discardedFields,
  };
}
