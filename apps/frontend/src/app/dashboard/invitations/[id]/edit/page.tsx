"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { useDemo } from "@/components/DemoProvider";
import { templateId, type Invitation, type InvitationEvent, type InvitationStatus, type Session } from "@/domain";
import type { DemoRuntime } from "@/lib/demo-runtime";

function loadInvitation(runtime: DemoRuntime, session: Session, id: string): { invitation: Invitation | null; error: string } {
  try { return { invitation: runtime.invitationService.getOwned(session, id), error: "" }; }
  catch (cause) { return { invitation: null, error: cause instanceof Error ? cause.message : "Undangan tidak dapat dibuka." }; }
}

function orderedEvents(events: InvitationEvent[]): InvitationEvent[] {
  return [...events].sort((left, right) => left.sortOrder - right.sortOrder);
}

function resequenceEvents(events: InvitationEvent[]): InvitationEvent[] {
  return events.map((event, sortOrder) => ({ ...event, sortOrder }));
}

export default function EditInvitationPage() {
  const { id } = useParams<{ id: string }>();
  const { runtime, session } = useDemo();
  if (!runtime || !session) return <AppShell title="Editor undangan"><div className="state-card"><p>Memuat data terbaru…</p></div></AppShell>;
  const { invitation, error } = loadInvitation(runtime, session, id);
  if (!invitation) return <AppShell title="Editor undangan"><div className="state-card"><p>{error}</p></div></AppShell>;
  return <InvitationEditor key={id} initialInvitation={invitation} />;
}

function InvitationEditor({ initialInvitation }: { initialInvitation: Invitation }) {
  const { runtime, session } = useDemo();
  const [invitation, setInvitation] = useState(initialInvitation);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const templates = runtime?.templates.list().filter((item) => item.status === "active") ?? [];
  const events = orderedEvents(invitation.events);

  const save = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    setError("");
    setMessage("");
    try {
      if (!runtime || !session) throw new Error("Session belum siap.");
      const next = { ...invitation, events: resequenceEvents(events) };
      setInvitation(runtime.invitationService.update(session, next));
      setMessage("Perubahan tersimpan di browser.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Perubahan gagal disimpan.");
    }
  };

  const updateEvent = (id: string, patch: Partial<InvitationEvent>) => {
    setInvitation((current) => ({
      ...current,
      events: current.events.map((event) => event.id === id ? { ...event, ...patch } : event),
    }));
  };

  const addEvent = () => {
    const sortOrder = events.length;
    const next: InvitationEvent = {
      id: `evt_${invitation.id}_${Date.now()}`,
      type: "reception",
      title: `Acara ${sortOrder + 1}`,
      date: events.at(-1)?.date ?? "2026-12-01",
      startTime: "10:00",
      endTime: "12:00",
      timezone: events.at(-1)?.timezone ?? "Asia/Jakarta",
      venueName: "Lokasi Acara",
      address: "Alamat acara",
      mapUrl: "",
      sortOrder,
    };
    setInvitation((current) => ({ ...current, events: [...orderedEvents(current.events), next] }));
  };

  const removeEvent = (id: string) => {
    if (events.length === 1) {
      setError("Undangan harus memiliki minimal satu acara.");
      return;
    }
    setError("");
    setInvitation((current) => ({
      ...current,
      events: resequenceEvents(orderedEvents(current.events).filter((event) => event.id !== id)),
    }));
  };

  const moveEvent = (id: string, offset: -1 | 1) => {
    const next = orderedEvents(invitation.events);
    const currentIndex = next.findIndex((event) => event.id === id);
    const targetIndex = currentIndex + offset;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= next.length) return;
    [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
    setInvitation((current) => ({ ...current, events: resequenceEvents(next) }));
  };

  return <AppShell title="Editor undangan">
    <nav className="section-nav" aria-label="Bagian editor"><a href="#umum">Umum</a><a href="#pasangan">Pasangan</a><a href="#acara">Acara</a><a href="#konten">Konten</a><a href="#tampilan">Tampilan</a></nav>
    <form className="form" onSubmit={save}>
      <section className="panel form two-column" id="umum"><h2 className="full">Informasi umum</h2><label className="field"><span>Judul</span><input value={invitation.title} onChange={(event) => setInvitation({ ...invitation, title: event.target.value })} required /></label><label className="field"><span>Slug</span><input value={invitation.slug} onChange={(event) => setInvitation({ ...invitation, slug: event.target.value })} required /></label><label className="field"><span>Status</span><select value={invitation.status} onChange={(event) => setInvitation({ ...invitation, status: event.target.value as InvitationStatus })}><option value="draft">Draft</option><option value="published">Published</option><option value="inactive">Inactive</option></select></label></section>
      <section className="panel form two-column" id="pasangan"><h2 className="full">Pasangan</h2><label className="field"><span>Partner one — nama lengkap</span><input value={invitation.couple.partnerOne.fullName} onChange={(event) => setInvitation({ ...invitation, couple: { ...invitation.couple, partnerOne: { ...invitation.couple.partnerOne, fullName: event.target.value } } })} required /></label><label className="field"><span>Partner one — panggilan</span><input value={invitation.couple.partnerOne.nickname} onChange={(event) => setInvitation({ ...invitation, couple: { ...invitation.couple, partnerOne: { ...invitation.couple.partnerOne, nickname: event.target.value } } })} required /></label><label className="field"><span>Partner two — nama lengkap</span><input value={invitation.couple.partnerTwo.fullName} onChange={(event) => setInvitation({ ...invitation, couple: { ...invitation.couple, partnerTwo: { ...invitation.couple.partnerTwo, fullName: event.target.value } } })} required /></label><label className="field"><span>Partner two — panggilan</span><input value={invitation.couple.partnerTwo.nickname} onChange={(event) => setInvitation({ ...invitation, couple: { ...invitation.couple, partnerTwo: { ...invitation.couple.partnerTwo, nickname: event.target.value } } })} required /></label></section>
      <section className="panel form" id="acara">
        <div className="event-heading"><div><h2>Rangkaian acara</h2><p>Urutan ini juga digunakan pada preview dan halaman publik.</p></div><button className="button secondary" type="button" onClick={addEvent}>Tambah acara</button></div>
        <div className="event-list">{events.map((event, index) => <fieldset className="event-editor" key={event.id}><legend>{index + 1}. {event.title}</legend><div className="event-actions"><button className="button ghost compact" type="button" onClick={() => moveEvent(event.id, -1)} disabled={index === 0} aria-label={`Naikkan ${event.title}`}>Naik</button><button className="button ghost compact" type="button" onClick={() => moveEvent(event.id, 1)} disabled={index === events.length - 1} aria-label={`Turunkan ${event.title}`}>Turun</button><button className="button danger compact" type="button" onClick={() => removeEvent(event.id)} disabled={events.length === 1}>Hapus</button></div><div className="form two-column"><label className="field"><span>Jenis</span><input value={event.type} onChange={(change) => updateEvent(event.id, { type: change.target.value })} required /></label><label className="field"><span>Judul acara</span><input value={event.title} onChange={(change) => updateEvent(event.id, { title: change.target.value })} required /></label><label className="field"><span>Tanggal</span><input type="date" value={event.date} onChange={(change) => updateEvent(event.id, { date: change.target.value })} required /></label><label className="field"><span>Zona waktu</span><input value={event.timezone} onChange={(change) => updateEvent(event.id, { timezone: change.target.value })} required /></label><label className="field"><span>Mulai</span><input type="time" value={event.startTime} onChange={(change) => updateEvent(event.id, { startTime: change.target.value })} required /></label><label className="field"><span>Selesai</span><input type="time" value={event.endTime} onChange={(change) => updateEvent(event.id, { endTime: change.target.value })} required /></label><label className="field"><span>Nama lokasi</span><input value={event.venueName} onChange={(change) => updateEvent(event.id, { venueName: change.target.value })} required /></label><label className="field"><span>Map URL</span><input type="url" value={event.mapUrl} onChange={(change) => updateEvent(event.id, { mapUrl: change.target.value })} placeholder="https://…" /></label><label className="field full"><span>Alamat</span><textarea value={event.address} onChange={(change) => updateEvent(event.id, { address: change.target.value })} required /></label></div></fieldset>)}</div>
      </section>
      <section className="panel form" id="konten"><h2>Konten</h2><label className="field"><span>Teks pembuka</span><textarea value={invitation.content.openingText} onChange={(event) => setInvitation({ ...invitation, content: { ...invitation.content, openingText: event.target.value } })} /></label><label className="field"><span>Quote</span><textarea value={invitation.content.quote} onChange={(event) => setInvitation({ ...invitation, content: { ...invitation.content, quote: event.target.value } })} /></label><label className="field"><span>Cerita</span><textarea value={invitation.content.story} onChange={(event) => setInvitation({ ...invitation, content: { ...invitation.content, story: event.target.value } })} /></label><label className="field"><span>Teks penutup</span><textarea value={invitation.content.closingText} onChange={(event) => setInvitation({ ...invitation, content: { ...invitation.content, closingText: event.target.value } })} /></label><label className="field"><span>Informasi hadiah</span><textarea value={invitation.content.giftInformation} onChange={(event) => setInvitation({ ...invitation, content: { ...invitation.content, giftInformation: event.target.value } })} /></label><label className="check-field"><input type="checkbox" checked={invitation.settings.showGiftInformation} onChange={(event) => setInvitation({ ...invitation, settings: { ...invitation.settings, showGiftInformation: event.target.checked } })} /><span>Tampilkan informasi hadiah</span></label></section>
      <section className="panel form" id="tampilan"><h2>Template</h2><label className="field"><span>Pilih tema</span><select value={`${invitation.templateKey}@${invitation.templateVersion}`} onChange={(event) => { const [templateKey, rawVersion] = event.target.value.split("@"); setInvitation({ ...invitation, templateKey, templateVersion: Number(rawVersion) }); }}>{templates.map((template) => <option key={templateId(template)} value={templateId(template)}>{template.name} — {template.description}</option>)}</select></label></section>
      {message ? <p className="form-success">{message}</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="actions"><button className="button" type="submit">Simpan perubahan</button><Link className="button secondary" href={`/dashboard/invitations/${invitation.id}/preview`}>Buka preview</Link></div>
    </form>
  </AppShell>;
}
