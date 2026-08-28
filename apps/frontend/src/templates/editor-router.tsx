"use client";

import { getTemplateModule } from "./registry";
import { parseTemplateContent } from "./registry";
import { InvitationModuleEditor } from "@/invitation-modules/editor";
import type { InvitationModuleContent } from "@/invitation-modules/content";
import type { InvitationImageMedia } from "@/repositories/contracts";

export function TemplateEditorRouter({ templateKey, templateVersion, contentSchemaVersion, invitationId, media, value, onChange, onMediaChange, onScheduleMediaDeletion, onMediaBusyChange }: {
  templateKey: string;
  templateVersion: number;
  contentSchemaVersion: number;
  invitationId?: string;
  media?: InvitationImageMedia[];
  value: unknown;
  onChange(value: InvitationModuleContent): void;
  onMediaChange?(media: InvitationImageMedia): void;
  onScheduleMediaDeletion?(mediaId: string): void;
  onMediaBusyChange?(busy: boolean): void;
}) {
  const templateModule = getTemplateModule(templateKey, templateVersion);
  if (!templateModule) return <p className="form-error">Editor template tidak tersedia.</p>;
  let parsed: InvitationModuleContent;
  try {
    parsed = parseTemplateContent(templateKey, templateVersion, contentSchemaVersion, value);
  } catch { return <p className="form-error">Konten modul tidak valid dan tidak dapat diedit.</p>; }
  return <InvitationModuleEditor template={templateModule.manifest} invitationId={invitationId} media={media} value={parsed} onChange={onChange} onMediaChange={onMediaChange} onScheduleMediaDeletion={onScheduleMediaDeletion} onMediaBusyChange={onMediaBusyChange} />;
}
