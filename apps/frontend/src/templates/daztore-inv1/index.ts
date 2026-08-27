import { defineTemplate } from "@/templates/define-template";
import { DaztoreInv1Template } from "./Template";
import { manifest } from "./manifest";
import { themeDefinition, themes } from "./themes";

export { DaztoreInv1Template as component } from "./Template";
export { manifest } from "./manifest";
export { themeDefinition, themes } from "./themes";
export const activeContentSchemaVersion = 2;
export const compatibleThemes = themes.map((theme) => `${theme.key}@${theme.version}`);
export const sectionRenderers = { "daztore-cover": true, "daztore-greeting": true, "daztore-couple": true, "daztore-quote": true, "daztore-events": true, "daztore-countdown": true, "daztore-story": true, "daztore-gallery": true, "daztore-video": true, "daztore-rsvp": true, "daztore-gift": true, "daztore-wishes": true, "daztore-maps": true, "daztore-closing": true } as const;

export const templateModule = defineTemplate({ manifest, availability: "production", activeContentSchemaVersion, component: DaztoreInv1Template, compatibleThemes, themes, themeDefinition, sectionRenderers });
