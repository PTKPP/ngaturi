"use client";

import type { TemplateEditorProps } from "@/templates/types";
import type { WeddingContent } from "./content-schema";

export function WeddingContentEditor({ value, onChange }: TemplateEditorProps<WeddingContent>) {
  const updateCopy = (key: keyof WeddingContent["copy"], next: string) => onChange({ ...value, copy: { ...value.copy, [key]: next } });
  const updateEvent = (id: string, patch: Partial<WeddingContent["events"][number]>) => onChange({ ...value, events: value.events.map((event) => event.id === id ? { ...event, ...patch } : event) });
  const addEvent = () => onChange({ ...value, events: [...value.events, { id: crypto.randomUUID(), type: "reception", title: `Acara ${value.events.length + 1}`, date: value.events.at(-1)?.date ?? "2026-12-01", startTime: "10:00", endTime: "12:00", timezone: "Asia/Jakarta", venueName: "Lokasi Acara", address: "Alamat acara", mapUrl: "", sortOrder: value.events.length }] });
  return <div className="form" data-template-editor>
    <h2>Konten template</h2>
    <div className="form two-column">
      <label className="field"><span>Nama lengkap partner satu</span><input value={value.couple.partnerOne.fullName} onChange={(event) => onChange({ ...value, couple: { ...value.couple, partnerOne: { ...value.couple.partnerOne, fullName: event.target.value } } })} required /></label>
      <label className="field"><span>Nama panggilan partner satu</span><input value={value.couple.partnerOne.nickname} onChange={(event) => onChange({ ...value, couple: { ...value.couple, partnerOne: { ...value.couple.partnerOne, nickname: event.target.value } } })} required /></label>
      <label className="field"><span>Nama lengkap partner dua</span><input value={value.couple.partnerTwo.fullName} onChange={(event) => onChange({ ...value, couple: { ...value.couple, partnerTwo: { ...value.couple.partnerTwo, fullName: event.target.value } } })} required /></label>
      <label className="field"><span>Nama panggilan partner dua</span><input value={value.couple.partnerTwo.nickname} onChange={(event) => onChange({ ...value, couple: { ...value.couple, partnerTwo: { ...value.couple.partnerTwo, nickname: event.target.value } } })} required /></label>
    </div>
    <div className="event-heading"><div><h2>Rangkaian acara</h2><p>Minimal satu acara; urutan disimpan bersama konten template.</p></div><button className="button secondary" type="button" onClick={addEvent}>Tambah acara</button></div>
    <div className="event-list">{value.events.map((item, index) => <fieldset className="event-editor" key={item.id}><legend>{index + 1}. {item.title}</legend><div className="form two-column">
      <label className="field"><span>Judul acara</span><input value={item.title} onChange={(event) => updateEvent(item.id, { title: event.target.value })} required /></label>
      <label className="field"><span>Jenis</span><input value={item.type} onChange={(event) => updateEvent(item.id, { type: event.target.value })} required /></label>
      <label className="field"><span>Tanggal</span><input type="date" value={item.date} onChange={(event) => updateEvent(item.id, { date: event.target.value })} required /></label>
      <label className="field"><span>Zona waktu</span><input value={item.timezone} onChange={(event) => updateEvent(item.id, { timezone: event.target.value })} required /></label>
      <label className="field"><span>Mulai</span><input type="time" value={item.startTime} onChange={(event) => updateEvent(item.id, { startTime: event.target.value })} required /></label>
      <label className="field"><span>Selesai</span><input type="time" value={item.endTime} onChange={(event) => updateEvent(item.id, { endTime: event.target.value })} required /></label>
      <label className="field"><span>Lokasi</span><input value={item.venueName} onChange={(event) => updateEvent(item.id, { venueName: event.target.value })} required /></label>
      <label className="field"><span>Map URL</span><input type="url" value={item.mapUrl} onChange={(event) => updateEvent(item.id, { mapUrl: event.target.value })} /></label>
      <label className="field full"><span>Alamat</span><textarea value={item.address} onChange={(event) => updateEvent(item.id, { address: event.target.value })} required /></label>
    </div><button className="button danger compact" type="button" disabled={value.events.length === 1} onClick={() => onChange({ ...value, events: value.events.filter((event) => event.id !== item.id).map((event, sortOrder) => ({ ...event, sortOrder })) })}>Hapus acara</button></fieldset>)}</div>
    <label className="field"><span>Teks pembuka</span><textarea value={value.copy.openingText} onChange={(event) => updateCopy("openingText", event.target.value)} /></label>
    <label className="field"><span>Quote</span><textarea value={value.copy.quote} onChange={(event) => updateCopy("quote", event.target.value)} /></label>
    <label className="field"><span>Cerita</span><textarea value={value.copy.story} onChange={(event) => updateCopy("story", event.target.value)} /></label>
    <label className="field"><span>Teks penutup</span><textarea value={value.copy.closingText} onChange={(event) => updateCopy("closingText", event.target.value)} /></label>
    <label className="field"><span>Informasi hadiah</span><textarea value={value.copy.giftInformation} onChange={(event) => updateCopy("giftInformation", event.target.value)} /></label>
    <label className="check-field"><input type="checkbox" checked={value.settings.showGiftInformation} onChange={(event) => onChange({ ...value, settings: { ...value.settings, showGiftInformation: event.target.checked } })} /><span>Tampilkan informasi hadiah</span></label>
  </div>;
}
