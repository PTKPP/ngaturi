"use client";

import Image from "next/image";
import { useState } from "react";
import {
  failImageUploadAction,
  finalizeImageUploadAction,
  prepareImageUploadAction,
  updateImageAltAction,
} from "@/app/actions/media";
import type { WeddingRenderModel } from "@/invitation-modules/schemas";
import type { ImageMediaPurpose, InvitationImageMedia } from "@/repositories/contracts";
import { inspectBrowserImage, uploadPreparedImage } from "./client-image";

const MEDIA_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function defaultAlt(file: File) {
  const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return name ? "Foto " + name : "Foto undangan";
}

function ImageUploader({ invitationId, purpose, label, multiple = false, onUploaded, onBusyChange }: {
  invitationId: string;
  purpose: ImageMediaPurpose;
  label: string;
  multiple?: boolean;
  onUploaded(media: InvitationImageMedia[]): void;
  onBusyChange(busy: boolean): void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);
    onBusyChange(true);
    setError("");
    const completed: InvitationImageMedia[] = [];
    let delivered = false;
    try {
      for (const file of files) {
        const inspected = await inspectBrowserImage(file);
        const prepared = await prepareImageUploadAction(invitationId, {
          purpose,
          clientUploadId: crypto.randomUUID(),
          originalFilename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          width: inspected.width,
          height: inspected.height,
          sha256: inspected.sha256,
          altText: defaultAlt(file),
        });
        if (prepared.reused) {
          if (prepared.media.status !== "ready") throw new Error("Image yang sama sedang diunggah atau diproses. Muat ulang editor setelah proses selesai.");
          completed.push(prepared.media);
          continue;
        }
        try {
          const objects = await uploadPreparedImage(file, prepared.slots);
          completed.push(await finalizeImageUploadAction(invitationId, prepared.media.id, objects));
        } catch (uploadError) {
          await failImageUploadAction(invitationId, prepared.media.id, uploadError instanceof Error ? uploadError.message : "Upload image gagal.").catch(() => undefined);
          throw uploadError;
        }
      }
      onUploaded(completed);
      delivered = true;
    } catch (cause) {
      if (completed.length && !delivered) onUploaded(completed);
      setError(cause instanceof Error ? cause.message : "Upload image gagal.");
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  };
  return <div className="media-uploader">
    <label className="field">
      <span>{label}</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple={multiple}
        disabled={busy}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          void upload(files);
        }}
      />
      <small>JPEG, PNG, WebP, atau AVIF; maksimal 10 MB per file. Original disimpan dan variant WebP dibuat di browser.</small>
    </label>
    {busy ? <p className="media-status" role="status">Mengoptimasi dan mengunggah image…</p> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
  </div>;
}

function AltTextEditor({ invitationId, media, onMediaChange }: { invitationId: string; media: InvitationImageMedia; onMediaChange(media: InvitationImageMedia): void }) {
  const [value, setValue] = useState(media.altText);
  const [status, setStatus] = useState("");
  const save = async () => {
    if (value.trim() === media.altText) return;
    setStatus("Menyimpan alt text…");
    try {
      onMediaChange(await updateImageAltAction(invitationId, media.id, value));
      setStatus("Alt text tersimpan.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Alt text gagal disimpan.");
    }
  };
  return <label className="field media-alt"><span>Alt text</span><input value={value} maxLength={240} onChange={(event) => setValue(event.target.value)} onBlur={() => void save()} /><small aria-live="polite">{status}</small></label>;
}

export function InvitationImageMediaEditor({ invitationId, value, media, onChange, onMediaChange, onScheduleDeletion, onBusyChange }: {
  invitationId: string;
  value: WeddingRenderModel;
  media: InvitationImageMedia[];
  onChange(value: WeddingRenderModel): void;
  onMediaChange(media: InvitationImageMedia): void;
  onScheduleDeletion(mediaId: string): void;
  onBusyChange(busy: boolean): void;
}) {
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const replacePartner = (key: "partnerOne" | "partnerTwo", next: InvitationImageMedia) => {
    const previous = value.couple[key].photo;
    onMediaChange(next);
    onChange({ ...value, couple: { ...value.couple, [key]: { ...value.couple[key], photo: next.id } } });
    if (MEDIA_ID.test(previous) && previous !== next.id) onScheduleDeletion(previous);
  };
  const clearPartner = (key: "partnerOne" | "partnerTwo") => {
    const previous = value.couple[key].photo;
    onChange({ ...value, couple: { ...value.couple, [key]: { ...value.couple[key], photo: "" } } });
    if (MEDIA_ID.test(previous)) onScheduleDeletion(previous);
  };
  const replaceGallery = (index: number, next: InvitationImageMedia) => {
    const previous = value.gallery[index];
    const gallery = [...value.gallery];
    gallery[index] = next.id;
    onMediaChange(next);
    onChange({ ...value, gallery });
    if (MEDIA_ID.test(previous) && previous !== next.id) onScheduleDeletion(previous);
  };
  const removeGallery = (index: number) => {
    const previous = value.gallery[index];
    onChange({ ...value, gallery: value.gallery.filter((_, itemIndex) => itemIndex !== index) });
    if (MEDIA_ID.test(previous)) onScheduleDeletion(previous);
  };
  const moveGallery = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.gallery.length) return;
    const gallery = [...value.gallery];
    [gallery[index], gallery[target]] = [gallery[target], gallery[index]];
    onChange({ ...value, gallery });
  };
  return <section className="form-section form image-media-editor" data-image-media>
    <div><h2>Image undangan</h2><p>Content hanya menyimpan media ID. Upload original dan variant memakai path unik pada private Storage.</p></div>
    <div className="form two-column">
      {(["partnerOne", "partnerTwo"] as const).map((key, index) => {
        const partner = value.couple[key];
        const current = mediaById.get(partner.photo);
        return <article className="media-card" key={key}>
          <h3>Foto {partner.fullName}</h3>
          {current ? <Image src={"/api/public-media/" + current.id + "?variant=thumbnail"} alt={current.altText} width={400} height={400} unoptimized/> : <p className="hint">Belum memakai image milik user.</p>}
          {current ? <AltTextEditor invitationId={invitationId} media={current} onMediaChange={onMediaChange} /> : null}
          <ImageUploader invitationId={invitationId} purpose="couple" label={current ? "Ganti foto" : "Upload foto"} onUploaded={(items) => { if (items[0]) replacePartner(key, items[0]); }} onBusyChange={onBusyChange} />
          {current ? <button className="button danger compact" type="button" onClick={() => clearPartner(key)}>Hapus foto</button> : null}
          <small>Partner {index + 1}</small>
        </article>;
      })}
    </div>
    <div className="event-heading"><div><h2>Galeri</h2><p>Upload banyak image, atur alt text, lalu ubah urutan dengan kontrol berikut.</p></div></div>
    <ImageUploader invitationId={invitationId} purpose="gallery" label="Tambah image galeri" multiple onUploaded={(items) => {
      items.forEach(onMediaChange);
      onChange({ ...value, gallery: [...value.gallery, ...items.map((item) => item.id)] });
    }} onBusyChange={onBusyChange} />
    <div className="media-grid">{value.gallery.map((mediaId, index) => {
      const item = mediaById.get(mediaId);
      return <article className="media-card" key={mediaId + "-" + index}>
        <h3>Image {index + 1}</h3>
        {item ? <Image src={"/api/public-media/" + item.id + "?variant=thumbnail"} alt={item.altText} width={400} height={400} unoptimized/> : <p className="form-error">Metadata media tidak tersedia.</p>}
        {item ? <AltTextEditor invitationId={invitationId} media={item} onMediaChange={onMediaChange} /> : null}
        <div className="media-actions">
          <button className="button ghost compact" type="button" disabled={index === 0} onClick={() => moveGallery(index, -1)}>Naik</button>
          <button className="button ghost compact" type="button" disabled={index === value.gallery.length - 1} onClick={() => moveGallery(index, 1)}>Turun</button>
          <button className="button danger compact" type="button" onClick={() => removeGallery(index)}>Hapus</button>
        </div>
        <ImageUploader invitationId={invitationId} purpose="gallery" label="Ganti image" onUploaded={(items) => { if (items[0]) replaceGallery(index, items[0]); }} onBusyChange={onBusyChange} />
      </article>;
    })}</div>
  </section>;
}
