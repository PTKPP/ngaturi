import { defineTemplate } from "@/templates/define-template";
import { WeddingDefaultTemplate } from "./Template";
import { manifest } from "./manifest";
import { themeDefinition, themes } from "./themes";

export { WeddingDefaultTemplate as component } from "./Template";
export { manifest } from "./manifest";
export { themeDefinition, themes } from "./themes";
export const activeContentSchemaVersion = 2;
export const compatibleThemes = themes.map((theme) => `${theme.key}@${theme.version}`);
export const sectionRenderers = { "wedding-default-cover": true, "wedding-default-greeting": true, "wedding-default-couple": true, "wedding-default-quote": true, "wedding-default-events": true, "wedding-default-countdown": true, "wedding-default-story": true, "wedding-default-gallery": true, "wedding-default-video": true, "wedding-default-rsvp": true, "wedding-default-gift": true, "wedding-default-wishes": true, "wedding-default-maps": true, "wedding-default-closing": true } as const;

export const templateModule = defineTemplate({ manifest, availability: "production", activeContentSchemaVersion, component: WeddingDefaultTemplate, compatibleThemes, themes, themeDefinition, sectionRenderers });
