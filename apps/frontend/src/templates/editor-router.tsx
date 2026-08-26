"use client";

import { getTemplateModule } from "./registry";
import { parseTemplateContent } from "./registry";
import { InvitationModuleEditor } from "@/invitation-modules/editor";
import type { InvitationModuleContent } from "@/invitation-modules/content";

export function TemplateEditorRouter({ templateKey, templateVersion, contentSchemaVersion, value, onChange }: { templateKey: string; templateVersion: number; contentSchemaVersion: number; value: unknown; onChange(value: InvitationModuleContent): void }) {
  const templateModule = getTemplateModule(templateKey, templateVersion);
  if (!templateModule) return <p className="form-error">Editor template tidak tersedia.</p>;
  let parsed: InvitationModuleContent;
  try {
    parsed = parseTemplateContent(templateKey, templateVersion, contentSchemaVersion, value);
  } catch { return <p className="form-error">Konten modul tidak valid dan tidak dapat diedit.</p>; }
  return <InvitationModuleEditor template={templateModule.manifest} value={parsed} onChange={onChange} />;
}
