import { defineTemplate } from "@/templates/define-template";
import { ElegantGoldTemplate } from "./Template";
import { manifest } from "./manifest";
import { themeDefinition, themes } from "./themes";

export { ElegantGoldTemplate as component } from "./Template";
export { manifest } from "./manifest";
export { themeDefinition, themes } from "./themes";
export const activeContentSchemaVersion = 2;
export const compatibleThemes = themes.map((theme) => `${theme.key}@${theme.version}`);
export const sectionRenderers = { "gold-hero": true, "gold-greeting": true, "gold-couple": true, "gold-quote": true, "gold-events": true, "gold-story": true, "gold-gift": true, "gold-closing": true } as const;

export const templateModule = defineTemplate({ manifest, availability: "compatibility", activeContentSchemaVersion, component: ElegantGoldTemplate, compatibleThemes, themes, themeDefinition, sectionRenderers });
