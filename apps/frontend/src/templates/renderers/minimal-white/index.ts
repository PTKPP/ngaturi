export { MinimalWhiteTemplate as component } from "./Template";
export { manifest } from "./manifest";
export const activeContentSchemaVersion = 2;
export const compatibleThemes = ["minimal-white-default@1", "minimal-white-sage@1"] as const;
export const sectionRenderers = { "minimal-hero": true, "minimal-greeting": true, "minimal-couple": true, "minimal-quote": true, "minimal-events": true, "minimal-story": true, "minimal-gift": true, "minimal-closing": true } as const;
