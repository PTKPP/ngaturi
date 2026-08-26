import { createWeddingContentDefaults } from "@/templates/shared/defaults";
import { DaztoreInv1ContentSchema } from "./schema";
export function createDefaultContent() { return DaztoreInv1ContentSchema.parse(createWeddingContentDefaults("daztore-inv1")); }
