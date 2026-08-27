import { defineTemplate } from "@/templates/define-template";
import { MinimalWhiteTemplate } from "./Template";
import { manifest } from "./manifest";
import { themeDefinition, themes } from "./themes";

export { MinimalWhiteTemplate as component } from "./Template";
export { manifest } from "./manifest";
export { themeDefinition, themes } from "./themes";
export const activeContentSchemaVersion = 2;
export const compatibleThemes = themes.map((theme) => `${theme.key}@${theme.version}`);
export const sectionRenderers = { "minimal-hero": true, "minimal-greeting": true, "minimal-couple": true, "minimal-quote": true, "minimal-events": true, "minimal-story": true, "minimal-gift": true, "minimal-closing": true } as const;

export const templateModule = defineTemplate({ manifest, availability: "compatibility", activeContentSchemaVersion, component: MinimalWhiteTemplate, compatibleThemes, themes, themeDefinition, sectionRenderers });
