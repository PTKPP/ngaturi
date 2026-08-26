export { DaztoreInv1Template as component } from "./Template";
export { manifest } from "./manifest";
export const activeContentSchemaVersion = 2;
export const compatibleThemes = ["daztore-inv1-default@1", "daztore-inv1-blue@1"] as const;
export const sectionRenderers = { "daztore-cover": true, "daztore-greeting": true, "daztore-couple": true, "daztore-quote": true, "daztore-events": true, "daztore-countdown": true, "daztore-story": true, "daztore-gallery": true, "daztore-gift": true, "daztore-maps": true, "daztore-closing": true } as const;
