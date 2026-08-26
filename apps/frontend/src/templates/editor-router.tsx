"use client";

import { getTemplateModule } from "./registry";
import type { WeddingContent } from "./shared/content-schema";

export function TemplateEditorRouter({ templateKey, templateVersion, value, onChange }: { templateKey: string; templateVersion: number; value: unknown; onChange(value: WeddingContent): void }) {
  const templateModule = getTemplateModule(templateKey, templateVersion);
  if (!templateModule) return <p className="form-error">Editor template tidak tersedia.</p>;
  const parsed = templateModule.contentSchema.safeParse(value);
  if (!parsed.success) return <p className="form-error">Konten template tidak valid dan tidak dapat diedit.</p>;
  const Editor = templateModule.editor;
  return <Editor value={parsed.data} onChange={onChange} />;
}
