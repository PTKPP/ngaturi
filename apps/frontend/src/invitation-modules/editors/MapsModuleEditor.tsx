"use client";

import { useState } from "react";
import { reportEmbedTelemetry } from "@/lib/embed-telemetry";
import type { WeddingRenderModel } from "../schemas";
import { normalizeMapUrl, type MapsModule } from "../definitions/external-embeds";

export function MapsModuleEditor({ content, value, onContentChange, onChange }: {
  content: WeddingRenderModel;
  value: MapsModule;
  onContentChange(value: WeddingRenderModel): void;
  onChange(value: MapsModule): void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  function commit(eventId: string) {
    const current = content.events.find((event) => event.id === eventId);
    if (!current) return;
    const raw = (drafts[eventId] ?? current.mapUrl ?? current.legacyUnsupportedMapUrl).trim();
    if (!raw) {
      setErrors((items) => ({ ...items, [eventId]: "" }));
      onContentChange({ ...content, events: content.events.map((event) => event.id === eventId ? { ...event, mapUrl: "", legacyUnsupportedMapUrl: "" } : event) });
      return;
    }
    const normalized = normalizeMapUrl(raw);
    if (!normalized) {
      setErrors((items) => ({ ...items, [eventId]: "Gunakan URL HTTPS Google Maps atau OpenStreetMap yang valid." }));
      reportEmbedTelemetry("invalid_provider_url", "maps");
      return;
    }
    setDrafts((items) => ({ ...items, [eventId]: normalized.canonicalUrl }));
    setErrors((items) => ({ ...items, [eventId]: "" }));
    onContentChange({ ...content, events: content.events.map((event) => event.id === eventId ? { ...event, mapUrl: normalized.canonicalUrl, legacyUnsupportedMapUrl: "" } : event) });
  }

  return <section className="form-section form">
    <div><h2>Peta</h2><p>Alamat tetap menjadi informasi utama. Link hanya menerima Google Maps atau OpenStreetMap.</p></div>
    <div className="form two-column">
      <label className="field"><span>Label tombol peta</span><input value={value.label} maxLength={40} onChange={(event) => onChange({ ...value, label: event.target.value })} /></label>
      <label className="check-field"><input type="checkbox" checked={value.embedEnabled} onChange={(event) => onChange({ ...value, embedEnabled: event.target.checked })} /><span>Izinkan embed Google Maps setelah interaksi tamu</span></label>
    </div>
    {content.events.map((item) => {
      const displayedUrl = drafts[item.id] ?? item.mapUrl ?? item.legacyUnsupportedMapUrl;
      const errorId = `map-url-error-${item.id}`;
      return <div className="form" key={item.id}>
        <strong>{item.title} - {item.venueName}</strong>
        <label className="field"><span>URL lokasi</span><input type="url" value={displayedUrl} onChange={(event) => setDrafts((items) => ({ ...items, [item.id]: event.target.value }))} onBlur={() => commit(item.id)} placeholder="https://www.google.com/maps/..." aria-describedby={errors[item.id] ? errorId : undefined} /></label>
        {errors[item.id] ? <p id={errorId} className="field-error" role="alert">{errors[item.id]}</p> : null}
        {item.legacyUnsupportedMapUrl && !item.mapUrl ? <p className="field-warning">URL lama tidak didukung dan tidak ditampilkan ke tamu.</p> : null}
      </div>;
    })}
  </section>;
}
