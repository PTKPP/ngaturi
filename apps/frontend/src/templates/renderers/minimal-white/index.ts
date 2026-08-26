export { MinimalWhiteTemplate as component } from "./Template";
export { manifest } from "./manifest";
export { MinimalWhiteContentSchema as contentSchema } from "./schema";
export { createDefaultContent } from "./defaults";
export { MinimalWhiteEditor as editor } from "./editor";
export { migrateContent, convertContent } from "./migrations";
export const activeContentSchemaVersion = 1;
export const compatibleThemes = ["minimal-white-default@1", "minimal-white-sage@1"] as const;
