"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { useDemo } from "@/components/DemoProvider";
import { templateId, type Invitation, type InvitationStatus, type Session } from "@/domain";
import type { DemoRuntime } from "@/lib/demo-runtime";

function loadInvitation(runtime: DemoRuntime, session: Session, id: string): { invitation: Invitation | null; error: string } {
  try { return { invitation: runtime.invitationService.getOwned(session, id), error: "" }; }
  catch (cause) { return { invitation: null, error: cause instanceof Error ? cause.message : "Undangan tidak dapat dibuka." }; }
}

export default function EditInvitationPage() {
  const { id } = useParams<{ id: string }>(); const { runtime, session } = useDemo();
  if (!runtime || !session) return <AppShell title="Editor undangan"><div className="state-card"><p>Memuat data terbaru…</p></div></AppShell>;
  const { invitation, error } = loadInvitation(runtime, session, id);
  if (!invitation) return <AppShell title="Editor undangan"><div className="state-card"><p>{error}</p></div></AppShell>;
  return <InvitationEditor key={id} initialInvitation={invitation} />;
}

function InvitationEditor({ initialInvitation }: { initialInvitation: Invitation }) {
  const { runtime, session } = useDemo();
  const [invitation, setInvitation] = useState(initialInvitation); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const event = invitation.events[0]; const templates = runtime?.templates.list().filter((item) => item.status === "active") ?? [];
  const save = (formEvent: FormEvent) => { formEvent.preventDefault(); setError(""); setMessage(""); try { if (!runtime || !session) throw new Error("Session belum siap."); setInvitation(runtime.invitationService.update(session, invitation)); setMessage("Perubahan tersimpan di browser."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Perubahan gagal disimpan."); } };
  const updateEvent = (patch: Partial<typeof event>) => setInvitation({ ...invitation, events: invitation.events.map((item, index) => index === 0 ? { ...item, ...patch } : item) });
  return <AppShell title="Editor undangan">
    <nav className="section-nav" aria-label="Bagian editor"><a href="#umum">Umum</a><a href="#pasangan">Pasangan</a><a href="#acara">Acara</a><a href="#konten">Konten</a><a href="#tampilan">Tampilan</a></nav>
    <form className="form" onSubmit={save}>
      <section className="panel form two-column" id="umum"><h2 className="full">Informasi umum</h2><label className="field"><span>Judul</span><input value={invitation.title} onChange={(e) => setInvitation({ ...invitation, title: e.target.value })} required /></label><label className="field"><span>Slug</span><input value={invitation.slug} onChange={(e) => setInvitation({ ...invitation, slug: e.target.value })} required /></label><label className="field"><span>Status</span><select value={invitation.status} onChange={(e) => setInvitation({ ...invitation, status: e.target.value as InvitationStatus })}><option value="draft">Draft</option><option value="published">Published</option><option value="inactive">Inactive</option></select></label></section>
      <section className="panel form two-column" id="pasangan"><h2 className="full">Pasangan</h2><label className="field"><span>Partner one — nama lengkap</span><input value={invitation.couple.partnerOne.fullName} onChange={(e) => setInvitation({ ...invitation, couple: { ...invitation.couple, partnerOne: { ...invitation.couple.partnerOne, fullName: e.target.value } } })} required /></label><label className="field"><span>Partner one — panggilan</span><input value={invitation.couple.partnerOne.nickname} onChange={(e) => setInvitation({ ...invitation, couple: { ...invitation.couple, partnerOne: { ...invitation.couple.partnerOne, nickname: e.target.value } } })} required /></label><label className="field"><span>Partner two — nama lengkap</span><input value={invitation.couple.partnerTwo.fullName} onChange={(e) => setInvitation({ ...invitation, couple: { ...invitation.couple, partnerTwo: { ...invitation.couple.partnerTwo, fullName: e.target.value } } })} required /></label><label className="field"><span>Partner two — panggilan</span><input value={invitation.couple.partnerTwo.nickname} onChange={(e) => setInvitation({ ...invitation, couple: { ...invitation.couple, partnerTwo: { ...invitation.couple.partnerTwo, nickname: e.target.value } } })} required /></label></section>
      <section className="panel form two-column" id="acara"><h2 className="full">Acara utama</h2><label className="field"><span>Judul acara</span><input value={event.title} onChange={(e) => updateEvent({ title: e.target.value })} required /></label><label className="field"><span>Tanggal</span><input type="date" value={event.date} onChange={(e) => updateEvent({ date: e.target.value })} required /></label><label className="field"><span>Mulai</span><input type="time" value={event.startTime} onChange={(e) => updateEvent({ startTime: e.target.value })} required /></label><label className="field"><span>Selesai</span><input type="time" value={event.endTime} onChange={(e) => updateEvent({ endTime: e.target.value })} required /></label><label className="field"><span>Nama lokasi</span><input value={event.venueName} onChange={(e) => updateEvent({ venueName: e.target.value })} required /></label><label className="field"><span>Map URL</span><input type="url" value={event.mapUrl} onChange={(e) => updateEvent({ mapUrl: e.target.value })} placeholder="https://…" /></label><label className="field full"><span>Alamat</span><textarea value={event.address} onChange={(e) => updateEvent({ address: e.target.value })} required /></label></section>
      <section className="panel form" id="konten"><h2>Konten</h2><label className="field"><span>Teks pembuka</span><textarea value={invitation.content.openingText} onChange={(e) => setInvitation({ ...invitation, content: { ...invitation.content, openingText: e.target.value } })} /></label><label className="field"><span>Quote</span><textarea value={invitation.content.quote} onChange={(e) => setInvitation({ ...invitation, content: { ...invitation.content, quote: e.target.value } })} /></label><label className="field"><span>Teks penutup</span><textarea value={invitation.content.closingText} onChange={(e) => setInvitation({ ...invitation, content: { ...invitation.content, closingText: e.target.value } })} /></label></section>
      <section className="panel form" id="tampilan"><h2>Template</h2><label className="field"><span>Pilih tema</span><select value={`${invitation.templateKey}@${invitation.templateVersion}`} onChange={(e) => { const [templateKey, rawVersion] = e.target.value.split("@"); setInvitation({ ...invitation, templateKey, templateVersion: Number(rawVersion) }); }}>{templates.map((template) => <option key={templateId(template)} value={templateId(template)}>{template.name} — {template.description}</option>)}</select></label></section>
      {message ? <p className="form-success">{message}</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="actions"><button className="button" type="submit">Simpan perubahan</button><Link className="button secondary" href={`/dashboard/invitations/${invitation.id}/preview`}>Buka preview</Link></div>
    </form>
  </AppShell>;
}
