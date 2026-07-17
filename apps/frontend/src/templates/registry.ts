import * as daztoreInv1 from "./themes/daztore-inv1";
import * as elegantGold from "./themes/elegant-gold";
import * as minimalWhite from "./themes/minimal-white";
import type { TemplateModule } from "./types";

export const templateRegistry = {
  "elegant-gold@1": elegantGold,
  "minimal-white@1": minimalWhite,
  "daztore-inv1@1": daztoreInv1,
} satisfies Record<string, TemplateModule>;

export type RegisteredTemplateId = keyof typeof templateRegistry;

export function getTemplateModule(key: string, version: number): TemplateModule | null {
  return (templateRegistry as Record<string, TemplateModule>)[`${key}@${version}`] ?? null;
}
