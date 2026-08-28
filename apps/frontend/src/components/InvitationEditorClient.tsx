"use client";

import Link from "next/link";
import { useState } from "react";
import type { Invitation, InvitationTemplate, InvitationTheme } from "@/domain";
import { saveInvitationAction, switchTemplateAction } from "@/app/actions/invitations";
import { TemplateEditorRouter } from "@/templates/editor-router";
import { getTemplateModule } from "@/templates/registry";
import { TemplateRenderer } from "@/templates/renderer";
import { isTemplateAvailableForCreation } from "@/templates/registry";
import type { InvitationImageMedia } from "@/repositories/contracts";

const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function collectMediaIds(value: unknown, target = new Set<string>()): Set<string> {
  if (typeof value === "string" && MEDIA_ID.test(value)) target.add(value);
  else if (Array.isArray(value)) value.forEach((item) => collectMediaIds(item, target));
  else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach((item) => collectMediaIds(item, target));
  return target;
}

export function InvitationEditorClient({ initialInvitation, initialMedia = [], templates, themes, routeSlug }: { initialInvitation: Invitation; initialMedia?: InvitationImageMedia[]; templates: InvitationTemplate[]; themes: InvitationTheme[]; routeSlug: string }) {
  const [invitation, setInvitation] = useState(initialInvitation);
  const [media, setMedia] = useState(initialMedia);
  const [pendingMediaDeletion, setPendingMediaDeletion] = useState<string[]>([]);
  const [mediaOperations, setMediaOperations] = useState(0);
  const currentTemplateId = `${invitation.templateKey}@${invitation.templateVersion}`;
  const [targetTemplateId, setTargetTemplateId] = useState(currentTemplateId);
  const [livePreviewOpen, setLivePreviewOpen] = useState(false);
  const compatibleTemplates = templates.filter((template) => template.categoryKey === invitation.categoryKey && template.categoryVersion === invitation.categoryVersion && (`${template.key}@${template.version}` === currentTemplateId || isTemplateAvailableForCreation(template.key, template.version)));
  const compatibleThemes = themes.filter((theme) => theme.templateKey === invitation.templateKey && theme.templateVersion === invitation.templateVersion);
  const referencedMedia = collectMediaIds(invitation.content);
  const effectiveMediaDeletion = pendingMediaDeletion.filter((mediaId) => !referencedMedia.has(mediaId));
  const updateMedia = (next: InvitationImageMedia) => setMedia((current) => [...current.filter((item) => item.id !== next.id), next]);
  return <>
    <form className="form" action={saveInvitationAction}>
      <input type="hidden" name="invitation" value={JSON.stringify(invitation)} />
      <input type="hidden" name="deleteMediaIds" value={JSON.stringify(effectiveMediaDeletion)} />
      <section className="panel form two-column">
        <h2 className="full">Informasi umum</h2>
        <label className="field"><span>Judul</span><input value={invitation.title} onChange={(event) => setInvitation({ ...invitation, title: event.target.value })} required /></label>
        <label className="field"><span>Route publik</span><input value={`/${routeSlug}`} readOnly /></label>
        <label className="field"><span>Status</span><input value={invitation.status} readOnly /></label>
        <label className="field"><span>Tema</span><select value={`${invitation.themeKey}@${invitation.themeVersion}`} onChange={(event) => { const [themeKey, raw] = event.target.value.split("@"); setInvitation({ ...invitation, themeKey, themeVersion: Number(raw) }); }}>{compatibleThemes.map((theme) => <option key={`${theme.key}@${theme.version}`} value={`${theme.key}@${theme.version}`}>{theme.name}</option>)}</select><small>Tema hanya mengubah token visual.</small></label>
      </section>
      <section className="panel form-section">
        <TemplateEditorRouter templateKey={invitation.templateKey} templateVersion={invitation.templateVersion} contentSchemaVersion={invitation.contentSchemaVersion} invitationId={invitation.id} media={media} value={invitation.content}
          onChange={(content) => setInvitation({ ...invitation, content, contentSchemaVersion: getTemplateModule(invitation.templateKey, invitation.templateVersion)?.activeContentSchemaVersion ?? invitation.contentSchemaVersion })}
          onMediaChange={updateMedia}
          onScheduleMediaDeletion={(mediaId) => setPendingMediaDeletion((current) => current.includes(mediaId) ? current : [...current, mediaId])}
          onMediaBusyChange={(busy) => setMediaOperations((current) => Math.max(0, current + (busy ? 1 : -1)))}
        />
      </section>
      <div className="actions"><button className="button" type="submit" disabled={mediaOperations > 0}>Simpan perubahan</button><button className="button secondary" type="button" onClick={() => setLivePreviewOpen(true)}>Preview langsung</button><Link className="button ghost" href={`/dashboard/invitations/${invitation.id}/preview`}>Buka halaman preview</Link></div>
    </form>
    <section className="panel form-section">
      <h2>Ganti template</h2>
      <p>Hanya tersedia ketika status draft dan dalam kategori yang sama. Data modul yang tidak digunakan template tujuan tetap disimpan sebagai modul tidak aktif.</p>
      <form className="form" action={switchTemplateAction}>
        <input type="hidden" name="id" value={invitation.id} />
        <label className="field"><span>Template tujuan</span><select name="template" value={targetTemplateId} onChange={(event) => setTargetTemplateId(event.target.value)}>{compatibleTemplates.map((template) => <option key={`${template.key}@${template.version}`} value={`${template.key}@${template.version}`}>{template.name}</option>)}</select></label>
        <button className="button secondary" type="submit" disabled={invitation.status !== "draft" || targetTemplateId === currentTemplateId}>Ganti template</button>
      </form>
    </section>
    {livePreviewOpen ? <div className="live-preview" role="dialog" aria-modal="true" aria-label="Preview undangan langsung"><button className="button live-preview-close" type="button" onClick={() => setLivePreviewOpen(false)}>Tutup preview</button><div className="live-preview-canvas"><TemplateRenderer invitation={invitation} media={media} preview /></div></div> : null}
  </>;
}
