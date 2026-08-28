"use client";

import { useState } from "react";
import { failAudioUploadAction, finalizeAudioUploadAction, prepareAudioUploadAction } from "@/app/actions/media";
import type { InvitationMusic } from "@/invitation-music/registry";
import type { InvitationAudioMedia } from "@/repositories/contracts";
import { inspectBrowserAudio, uploadPreparedAudio } from "./client-audio";

const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDuration(durationMs: number) {
  const seconds = Math.round(durationMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function InvitationAudioMediaEditor({ invitationId, value, media, onChange, onMediaChange, onScheduleDeletion, onBusyChange }: {
  invitationId: string;
  value: InvitationMusic;
  media: InvitationAudioMedia[];
  onChange(value: InvitationMusic): void;
  onMediaChange(media: InvitationAudioMedia): void;
  onScheduleDeletion(mediaId: string): void;
  onBusyChange(busy: boolean): void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = value.trackId === "custom" ? media.find((item) => item.id === value.mediaId) : undefined;

  const selectCustom = (next: InvitationAudioMedia) => {
    const previous = value.mediaId;
    onMediaChange(next);
    onChange({ ...value, trackId: "custom", mediaId: next.id, title: next.originalFilename.replace(/\.[^.]+$/, "").slice(0, 80) });
    if (MEDIA_ID.test(previous) && previous !== next.id) onScheduleDeletion(previous);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    onBusyChange(true);
    setError("");
    let mediaId = "";
    try {
      const inspected = await inspectBrowserAudio(file);
      const prepared = await prepareAudioUploadAction(invitationId, {
        purpose: "invitation_music",
        clientUploadId: crypto.randomUUID(),
        originalFilename: file.name,
        sizeBytes: file.size,
        ...inspected,
      });
      mediaId = prepared.media.id;
      if (prepared.reused) {
        if (prepared.media.status !== "ready") throw new Error("Audio yang sama sedang diunggah atau diproses. Muat ulang editor setelah proses selesai.");
        selectCustom(prepared.media);
      } else {
        if (!prepared.slot) throw new Error("Signed upload audio tidak tersedia.");
        await uploadPreparedAudio(file, prepared.slot);
        selectCustom(await finalizeAudioUploadAction(invitationId, prepared.media.id));
      }
    } catch (cause) {
      if (mediaId) await failAudioUploadAction(invitationId, mediaId, cause instanceof Error ? cause.message : "Upload audio gagal.").catch(() => undefined);
      setError(cause instanceof Error ? cause.message : "Upload audio gagal.");
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };

  const remove = (mediaId: string) => {
    if (value.trackId === "custom" && value.mediaId === mediaId) onChange({ ...value, trackId: "ambient-soft", mediaId: "", title: "Ambient lembut" });
    onScheduleDeletion(mediaId);
  };

  return <section className="form-section form" data-audio-media>
    <div>
      <h3>Audio milik Anda</h3>
      <p>Audio diunggah langsung ke private Storage. Gunakan Preview langsung untuk mendengar melalui music controller undangan.</p>
    </div>
    {media.filter((item) => item.status === "ready").length ? <div className="media-grid">{media.filter((item) => item.status === "ready").map((item) => <article className="media-card" key={item.id}>
      <strong>{item.originalFilename}</strong>
      <span>{formatDuration(item.durationMs)} · {(item.sizeBytes / 1024 / 1024).toFixed(1)} MB · {item.mimeType}</span>
      {current?.id === item.id ? <span className="badge">Dipakai</span> : <button className="button ghost compact" type="button" onClick={() => selectCustom(item)}>Gunakan audio ini</button>}
      <button className="button danger compact" type="button" onClick={() => remove(item.id)}>Hapus custom audio</button>
    </article>)}</div> : <p className="hint">Belum ada custom audio yang tersedia.</p>}
    <label className="field">
      <span>{current ? "Ganti custom audio" : "Upload custom audio"}</span>
      <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a" disabled={busy} onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        void upload(file);
      }} />
      <small>MP3 atau M4A/AAC, maksimal 15 MB dan 15 menit. Tidak ada transcoding.</small>
    </label>
    {busy ? <p className="media-status" role="status">Memvalidasi dan mengunggah audio…</p> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
  </section>;
}
