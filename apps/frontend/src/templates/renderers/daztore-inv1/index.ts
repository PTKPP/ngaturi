export { DaztoreInv1Template as component } from "./Template";
export { manifest } from "./manifest";
export { DaztoreInv1ContentSchema as contentSchema } from "./schema";
export { createDefaultContent } from "./defaults";
export { DaztoreInv1Editor as editor } from "./editor";
export { migrateContent, convertContent } from "./migrations";
export const activeContentSchemaVersion = 1;
export const compatibleThemes = ["daztore-inv1-default@1", "daztore-inv1-blue@1"] as const;
