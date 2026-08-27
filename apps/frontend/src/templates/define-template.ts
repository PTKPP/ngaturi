import type { TemplateModule } from "./types";

export function defineTemplate(value: TemplateModule): TemplateModule {
  const templateId = `${value.manifest.key}@${value.manifest.version}`;
  if (value.activeContentSchemaVersion !== value.manifest.activeContentSchemaVersion) throw new Error(`Versi konten template tidak cocok: ${templateId}.`);
  if (value.themeDefinition.schemaVersion !== value.manifest.themeSchemaVersion) throw new Error(`Versi tema template tidak cocok: ${templateId}.`);
  const themeIds = value.themes.map((theme) => `${theme.key}@${theme.version}`);
  if (new Set(themeIds).size !== themeIds.length) throw new Error(`Preset tema duplikat pada ${templateId}.`);
  if (value.themes.some((theme) => theme.templateKey !== value.manifest.key || theme.templateVersion !== value.manifest.version)) throw new Error(`Preset tema lintas template pada ${templateId}.`);
  if (value.compatibleThemes.some((id) => !themeIds.includes(id)) || themeIds.some((id) => !value.compatibleThemes.includes(id))) throw new Error(`Daftar tema template tidak cocok: ${templateId}.`);
  return value;
}
