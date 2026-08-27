"use client";

import Link from "next/link";
import { useState } from "react";
import type { Invitation, InvitationTemplate, InvitationTheme } from "@/domain";
import { saveInvitationAction, switchTemplateAction } from "@/app/actions/invitations";
import { TemplateEditorRouter } from "@/templates/editor-router";
import { getTemplateModule } from "@/templates/registry";
import { TemplateRenderer } from "@/templates/renderer";

export function InvitationEditorClient({ initialInvitation, templates, themes, routeSlug }: { initialInvitation: Invitation; templates: InvitationTemplate[]; themes: InvitationTheme[]; routeSlug: string }) {
  const [invitation, setInvitation] = useState(initialInvitation);
  const currentTemplateId = `${invitation.templateKey}@${invitation.templateVersion}`;
  const [targetTemplateId, setTargetTemplateId] = useState(currentTemplateId);
  const [livePreviewOpen, setLivePreviewOpen] = useState(false);
  const compatibleTemplates = templates.filter((template) => template.categoryKey === invitation.categoryKey && template.categoryVersion === invitation.categoryVersion);
  const compatibleThemes = themes.filter((theme) => theme.templateKey === invitation.templateKey && theme.templateVersion === invitation.templateVersion);
  return <>
    <form className="form" action={saveInvitationAction}>
      <input type="hidden" name="invitation" value={JSON.stringify(invitation)} />
      <section className="panel form two-column">
        <h2 className="full">Informasi umum</h2>
        <label className="field"><span>Judul</span><input value={invitation.title} onChange={(event) => setInvitation({ ...invitation, title: event.target.value })} required /></label>
        <label className="field"><span>Route publik</span><input value={`/${routeSlug}`} readOnly /></label>
        <label className="field"><span>Status</span><input value={invitation.status} readOnly /></label>
        <label className="field"><span>Tema</span><select value={`${invitation.themeKey}@${invitation.themeVersion}`} onChange={(event) => { const [themeKey, raw] = event.target.value.split("@"); setInvitation({ ...invitation, themeKey, themeVersion: Number(raw) }); }}>{compatibleThemes.map((theme) => <option key={`${theme.key}@${theme.version}`} value={`${theme.key}@${theme.version}`}>{theme.name}</option>)}</select><small>Tema hanya mengubah token visual.</small></label>
      </section>
      <section className="panel form-section">
        <TemplateEditorRouter templateKey={invitation.templateKey} templateVersion={invitation.templateVersion} contentSchemaVersion={invitation.contentSchemaVersion} value={invitation.content} onChange={(content) => setInvitation({ ...invitation, content, contentSchemaVersion: getTemplateModule(invitation.templateKey, invitation.templateVersion)?.activeContentSchemaVersion ?? invitation.contentSchemaVersion })} />
      </section>
      <div className="actions"><button className="button" type="submit">Simpan perubahan</button><button className="button secondary" type="button" onClick={() => setLivePreviewOpen(true)}>Preview langsung</button><Link className="button ghost" href={`/dashboard/invitations/${invitation.id}/preview`}>Buka halaman preview</Link></div>
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
    {livePreviewOpen ? <div className="live-preview" role="dialog" aria-modal="true" aria-label="Preview undangan langsung"><button className="button live-preview-close" type="button" onClick={() => setLivePreviewOpen(false)}>Tutup preview</button><div className="live-preview-canvas"><TemplateRenderer invitation={invitation} preview /></div></div> : null}
  </>;
}
