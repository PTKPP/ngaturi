export { ElegantGoldTemplate as component } from "./Template";
export { manifest } from "./manifest";
export { ElegantGoldContentSchema as contentSchema } from "./schema";
export { createDefaultContent } from "./defaults";
export { ElegantGoldEditor as editor } from "./editor";
export { migrateContent, convertContent } from "./migrations";
export const activeContentSchemaVersion = 1;
export const compatibleThemes = ["elegant-gold-default@1", "elegant-gold-rose@1"] as const;
