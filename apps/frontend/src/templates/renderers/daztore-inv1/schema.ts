import { WeddingContentSchema } from "@/templates/shared/content-schema";
import type { Invitation } from "@/domain";
export const DaztoreInv1ContentSchema = WeddingContentSchema;
export type DaztoreInv1Content = typeof DaztoreInv1ContentSchema._output;
export type DaztoreInv1ViewModel = Omit<Invitation, "content"> & DaztoreInv1Content & { content: DaztoreInv1Content["copy"] };
