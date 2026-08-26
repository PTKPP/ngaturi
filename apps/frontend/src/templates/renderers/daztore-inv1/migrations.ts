import { convertWeddingContent } from "@/templates/shared/conversion";
import { createDefaultContent } from "./defaults";
import { DaztoreInv1ContentSchema, type DaztoreInv1Content } from "./schema";
export function migrateContent(version: number, content: unknown): DaztoreInv1Content { if (version !== 1) throw new Error(`Versi konten daztore-inv1 tidak didukung: ${version}.`); return DaztoreInv1ContentSchema.parse(content); }
export function convertContent(content: unknown) { return convertWeddingContent(content, createDefaultContent()); }
