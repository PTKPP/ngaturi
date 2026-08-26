import { convertWeddingContent } from "@/templates/shared/conversion";
import { createDefaultContent } from "./defaults";
import { MinimalWhiteContentSchema, type MinimalWhiteContent } from "./schema";
export function migrateContent(version: number, content: unknown): MinimalWhiteContent { if (version !== 1) throw new Error(`Versi konten minimal-white tidak didukung: ${version}.`); return MinimalWhiteContentSchema.parse(content); }
export function convertContent(content: unknown) { return convertWeddingContent(content, createDefaultContent()); }
