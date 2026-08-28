"use client";

import type { AudioContentSignature, SignedAudioUploadSlot } from "@/repositories/contracts";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_DURATION_MS = 15 * 60 * 1000;

export interface InspectedBrowserAudio {
  mimeType: "audio/mpeg" | "audio/mp4";
  durationMs: number;
  sha256: string;
  contentSignature: AudioContentSignature;
}

export function detectAudioSignature(bytes: Uint8Array): AudioContentSignature | null {
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return "id3";
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "mpeg-frame";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") return "mp4-ftyp";
  return null;
}

function normalizedMime(file: File, signature: AudioContentSignature) {
  if (signature === "id3" || signature === "mpeg-frame") {
    if (!["audio/mpeg", "audio/mp3", ""].includes(file.type)) throw new Error("MIME file tidak cocok dengan signature MP3.");
    return "audio/mpeg" as const;
  }
  if (!["audio/mp4", "audio/x-m4a", "audio/aac", ""].includes(file.type)) throw new Error("MIME file tidak cocok dengan container M4A/AAC.");
  return "audio/mp4" as const;
}

function readDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const audio = document.createElement("audio");
    const source = URL.createObjectURL(file);
    const cleanup = () => {
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(source);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const durationMs = Math.round(audio.duration * 1000);
      cleanup();
      if (!Number.isSafeInteger(durationMs) || durationMs < 1000 || durationMs > MAX_DURATION_MS) reject(new Error("Durasi audio harus antara 1 detik dan 15 menit."));
      else resolve(durationMs);
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Audio tidak dapat dibaca oleh browser."));
    };
    audio.src = source;
  });
}

export async function inspectBrowserAudio(file: File): Promise<InspectedBrowserAudio> {
  if (file.size <= 0 || file.size > MAX_BYTES) throw new Error("Audio maksimal 15 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentSignature = detectAudioSignature(bytes.subarray(0, 16));
  if (!contentSignature) throw new Error("Signature audio tidak dikenali. Gunakan MP3 atau M4A/AAC.");
  const mimeType = normalizedMime(file, contentSignature);
  const [digest, durationMs] = await Promise.all([crypto.subtle.digest("SHA-256", bytes), readDuration(file)]);
  const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  return { mimeType, durationMs, sha256, contentSignature };
}

export async function uploadPreparedAudio(file: File, slot: SignedAudioUploadSlot) {
  const { error } = await createBrowserSupabaseClient().storage.from("invitation-media").uploadToSignedUrl(slot.path, slot.token, file, {
    contentType: slot.contentType,
    upsert: false,
  });
  if (error) throw new Error("Upload audio gagal: " + error.message);
}
