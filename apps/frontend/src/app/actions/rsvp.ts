"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { InvitationRsvpService } from "@/application/rsvp-service";
import { RsvpDomainError } from "@/repositories/contracts";
import { createInvitationRsvpRepository } from "@/repositories/supabase";

export type SubmitRsvpActionResult =
  | { ok: true; submittedAt: string; idempotent: boolean }
  | { ok: false; code: string; message: string };

async function requestSourceHash() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = requestHeaders.get("x-real-ip")?.trim() || forwarded || "unknown";
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 300) || "unknown";
  const secret = process.env.RSVP_RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Konfigurasi rate limit RSVP belum tersedia.");
  return createHmac("sha256", secret).update(`${address}\u001f${userAgent}`).digest("hex");
}

export async function submitRsvpAction(candidate: unknown): Promise<SubmitRsvpActionResult> {
  try {
    const result = await new InvitationRsvpService(createInvitationRsvpRepository()).submitGuest(candidate, await requestSourceHash());
    return { ok: true, submittedAt: result.submittedAt, idempotent: result.idempotent };
  } catch (error) {
    if (error instanceof ZodError) return { ok: false, code: "RSVP_INVALID", message: "Periksa nama, status kehadiran, jumlah tamu, dan catatan RSVP." };
    if (error instanceof RsvpDomainError) return { ok: false, code: error.code, message: error.message };
    return { ok: false, code: "RSVP_UNAVAILABLE", message: "RSVP belum dapat dikirim. Silakan coba lagi." };
  }
}
