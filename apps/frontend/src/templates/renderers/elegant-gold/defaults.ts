import { createWeddingContentDefaults } from "@/templates/shared/defaults";
import { ElegantGoldContentSchema } from "./schema";
export function createDefaultContent() { return ElegantGoldContentSchema.parse(createWeddingContentDefaults("elegant-gold")); }
