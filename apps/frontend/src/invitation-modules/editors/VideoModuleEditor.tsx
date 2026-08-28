"use client";

import { useState } from "react";
import { reportEmbedTelemetry } from "@/lib/embed-telemetry";
import {
  DEFAULT_VIDEO_MODULE,
  normalizeVideoUrl,
  type VideoModule,
  videoExternalUrl,
} from "../definitions/external-embeds";

function moduleUrl(value: VideoModule): string {
  if (value.provider !== "none") return videoExternalUrl(value);
  return value.legacyUnsupportedUrl;
}

export function VideoModuleEditor({ value, onChange }: { value: VideoModule; onChange(value: VideoModule): void }) {
  const [url, setUrl] = useState(() => moduleUrl(value));
  const [error, setError] = useState("");

  function saveUrl() {
    const raw = url.trim();
    if (!raw) {
      setError("");
      onChange({ ...DEFAULT_VIDEO_MODULE });
      return;
    }
    const normalized = normalizeVideoUrl(raw);
    if (!normalized) {
      setError("Gunakan URL HTTPS YouTube atau Vimeo yang valid.");
      reportEmbedTelemetry("invalid_provider_url", "video");
      return;
    }
    setError("");
    const next: VideoModule = { ...normalized, embedEnabled: value.provider === "none" ? true : value.embedEnabled, legacyUnsupportedUrl: "" };
    onChange(next);
    setUrl(videoExternalUrl(normalized));
  }

  return <section className="form-section form">
    <div><h2>Video</h2><p>YouTube dan Vimeo saja. URL disimpan sebagai provider dan ID video, bukan iframe.</p></div>
    <label className="field"><span>URL YouTube atau Vimeo</span><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} onBlur={saveUrl} placeholder="https://www.youtube.com/watch?v=..." aria-describedby={error ? "video-url-error" : undefined} /></label>
    {error ? <p id="video-url-error" className="field-error" role="alert">{error}</p> : null}
    {value.provider === "none" && value.legacyUnsupportedUrl ? <p className="field-warning">URL lama tidak didukung dan tidak ditampilkan. Ganti dengan URL YouTube atau Vimeo.</p> : null}
    {value.provider !== "none" ? <>
      <p>Provider: <strong>{value.provider === "youtube" ? "YouTube" : "Vimeo"}</strong></p>
      <label className="check-field"><input type="checkbox" checked={value.embedEnabled} onChange={(event) => onChange({ ...value, embedEnabled: event.target.checked })} /><span>Izinkan embed setelah tamu menekan tombol tampilkan</span></label>
    </> : null}
  </section>;
}
