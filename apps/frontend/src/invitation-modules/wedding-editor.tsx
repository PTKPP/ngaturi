"use client";

import type { TemplateEditorProps } from "@/templates/types";
import type { WeddingRenderModel } from "./schemas";

export function WeddingModuleEditor({ value, onChange }: TemplateEditorProps<WeddingRenderModel>) {
  const updateCopy = (key: keyof WeddingRenderModel["copy"], next: string) => onChange({ ...value, copy: { ...value.copy, [key]: next } });
  const updateEvent = (id: string, patch: Partial<WeddingRenderModel["events"][number]>) => onChange({ ...value, events: value.events.map((event) => event.id === id ? { ...event, ...patch } : event) });
  const updatePartner = (key: "partnerOne" | "partnerTwo", patch: Partial<WeddingRenderModel["couple"]["partnerOne"]>) => onChange({ ...value, couple: { ...value.couple, [key]: { ...value.couple[key], ...patch } } });
  const addEvent = () => onChange({ ...value, events: [...value.events, { id: crypto.randomUUID(), type: "reception", title: `Acara ${value.events.length + 1}`, date: value.events.at(-1)?.date ?? "2026-12-01", startTime: "10:00", endTime: "12:00", timezone: "Asia/Jakarta", venueName: "Lokasi Acara", address: "Alamat acara", mapUrl: "", sortOrder: value.events.length }] });
  return <div className="form">
    <h2>Konten modul aktif</h2>
    <div className="form two-column">
      <label className="field"><span>Nama lengkap partner satu</span><input value={value.couple.partnerOne.fullName} onChange={(event) => onChange({ ...value, couple: { ...value.couple, partnerOne: { ...value.couple.partnerOne, fullName: event.target.value } } })} required /></label>
      <label className="field"><span>Nama panggilan partner satu</span><input value={value.couple.partnerOne.nickname} onChange={(event) => onChange({ ...value, couple: { ...value.couple, partnerOne: { ...value.couple.partnerOne, nickname: event.target.value } } })} required /></label>
      <label className="field"><span>Nama lengkap partner dua</span><input value={value.couple.partnerTwo.fullName} onChange={(event) => onChange({ ...value, couple: { ...value.couple, partnerTwo: { ...value.couple.partnerTwo, fullName: event.target.value } } })} required /></label>
      <label className="field"><span>Nama panggilan partner dua</span><input value={value.couple.partnerTwo.nickname} onChange={(event) => onChange({ ...value, couple: { ...value.couple, partnerTwo: { ...value.couple.partnerTwo, nickname: event.target.value } } })} required /></label>
      <label className="field"><span>Orang tua partner satu (satu nama per baris)</span><textarea value={value.couple.partnerOne.parentNames.join("\n")} onChange={(event) => updatePartner("partnerOne", { parentNames: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label>
      <label className="field"><span>Orang tua partner dua (satu nama per baris)</span><textarea value={value.couple.partnerTwo.parentNames.join("\n")} onChange={(event) => updatePartner("partnerTwo", { parentNames: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label>
      <label className="field"><span>Media ID foto partner satu</span><input value={value.couple.partnerOne.photo} onChange={(event) => updatePartner("partnerOne", { photo: event.target.value })} placeholder="UUID media atau aset template" /></label>
      <label className="field"><span>Media ID foto partner dua</span><input value={value.couple.partnerTwo.photo} onChange={(event) => updatePartner("partnerTwo", { photo: event.target.value })} placeholder="UUID media atau aset template" /></label>
    </div>
    <div className="event-heading"><div><h2>Rangkaian acara</h2><p>Minimal satu acara; urutan disimpan bersama modul event.</p></div><button className="button secondary" type="button" onClick={addEvent}>Tambah acara</button></div>
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
    <label className="field"><span>Galeri (satu media ID per baris)</span><textarea value={value.gallery.join("\n")} onChange={(event) => onChange({ ...value, gallery: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} placeholder="UUID media atau aset template" /></label>
    <label className="check-field"><input type="checkbox" checked={value.settings.showGiftInformation} onChange={(event) => onChange({ ...value, settings: { ...value.settings, showGiftInformation: event.target.checked } })} /><span>Tampilkan informasi hadiah</span></label>
  </div>;
}
