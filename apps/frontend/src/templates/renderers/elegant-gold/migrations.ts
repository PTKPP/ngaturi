import { convertWeddingContent } from "@/templates/shared/conversion";
import { createDefaultContent } from "./defaults";
import { ElegantGoldContentSchema, type ElegantGoldContent } from "./schema";
export function migrateContent(version: number, content: unknown): ElegantGoldContent { if (version !== 1) throw new Error(`Versi konten elegant-gold tidak didukung: ${version}.`); return ElegantGoldContentSchema.parse(content); }
export function convertContent(content: unknown) { return convertWeddingContent(content, createDefaultContent()); }
