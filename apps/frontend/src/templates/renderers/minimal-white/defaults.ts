import { createWeddingContentDefaults } from "@/templates/shared/defaults";
import { MinimalWhiteContentSchema } from "./schema";
export function createDefaultContent() { return MinimalWhiteContentSchema.parse(createWeddingContentDefaults("minimal-white")); }
