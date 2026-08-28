"use client";

import type { CompletedImageObject, SignedImageUploadSlot } from "@/repositories/contracts";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;

export interface InspectedBrowserImage {
  width: number;
  height: number;
  sha256: string;
}

function toWebp(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== "image/webp") reject(new Error("Browser tidak dapat menghasilkan variant WebP."));
      else resolve(blob);
    }, "image/webp", 0.84);
  });
}

async function decodeImage(file: File) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Image tidak dapat dibaca oleh browser.");
  }
}

export async function inspectBrowserImage(file: File): Promise<InspectedBrowserImage> {
  if (!ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_BYTES) throw new Error("File harus JPEG, PNG, WebP, atau AVIF dan maksimal 10 MB.");
  const bitmap = await decodeImage(file);
  const { width, height } = bitmap;
  bitmap.close();
  if (width <= 0 || height <= 0 || width * height > MAX_PIXELS) throw new Error("Resolusi image terlalu besar; maksimal 40 megapiksel.");
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  return { width, height, sha256 };
}

export function calculateVariantDimensions(width: number, height: number, targetWidth: number) {
  const nextWidth = Math.min(width, targetWidth);
  return { width: nextWidth, height: Math.max(1, Math.round(height * nextWidth / width)) };
}

export async function uploadPreparedImage(file: File, slots: SignedImageUploadSlot[]): Promise<CompletedImageObject[]> {
  const original = slots.find((slot) => slot.key === "original");
  const variantSlots = slots.filter((slot) => slot.key !== "original");
  if (!original || variantSlots.length !== 3) throw new Error("Signed upload slot image tidak lengkap.");
  const bitmap = await decodeImage(file);
  try {
    const variants = await Promise.all(variantSlots.map(async (slot) => {
      const canvas = document.createElement("canvas");
      canvas.width = slot.targetWidth;
      canvas.height = slot.targetHeight;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas image tidak tersedia.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, slot.targetWidth, slot.targetHeight);
      return { slot, body: await toWebp(canvas) };
    }));
    const uploads = [{ slot: original, body: file as Blob }, ...variants];
    const supabase = createBrowserSupabaseClient();
    await Promise.all(uploads.map(async ({ slot, body }) => {
      const { error } = await supabase.storage.from("invitation-media").uploadToSignedUrl(slot.path, slot.token, body, {
        contentType: slot.contentType,
        upsert: false,
      });
      if (error) throw new Error("Upload " + slot.key + " gagal: " + error.message);
    }));
    return uploads.map(({ slot, body }) => ({
      key: slot.key,
      sizeBytes: body.size,
      width: slot.targetWidth,
      height: slot.targetHeight,
    }));
  } finally {
    bitmap.close();
  }
}
