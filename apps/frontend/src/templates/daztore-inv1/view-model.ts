import type { Invitation } from "@/domain";
import type { WeddingRenderModel } from "@/invitation-modules/schemas";

export type DaztoreInv1ViewModel = Omit<Invitation, "content"> & WeddingRenderModel & { content: WeddingRenderModel["copy"] };
