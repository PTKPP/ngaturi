import { defineTemplate } from "@/templates/define-template";
import { PlugAndPlayFixtureTemplate } from "./Template";
import { manifest } from "./manifest";
import { themeDefinition, themes } from "./themes";

export const sectionRenderers = {
  "fixture-cover": true,
  "fixture-couple": true,
  "fixture-events": true,
  "fixture-closing": true,
} as const;

export const templateModule = defineTemplate({
  manifest,
  availability: "compatibility",
  activeContentSchemaVersion: 2,
  component: PlugAndPlayFixtureTemplate,
  compatibleThemes: ["plug-and-play-fixture-default@1"],
  themes,
  themeDefinition,
  sectionRenderers,
});
