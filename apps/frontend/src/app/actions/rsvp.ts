"use server";

import { ZodError } from "zod";
import { InvitationRsvpService } from "@/application/rsvp-service";
import { RsvpDomainError } from "@/repositories/contracts";
import { createInvitationRsvpRepository } from "@/repositories/supabase";
import { requestSourceHash } from "./request-fingerprint";

export type SubmitRsvpActionResult =
  | { ok: true; submittedAt: string; idempotent: boolean }
  | { ok: false; code: string; message: string };

export async function submitRsvpAction(candidate: unknown): Promise<SubmitRsvpActionResult> {
  try {
    const result = await new InvitationRsvpService(createInvitationRsvpRepository()).submitGuest(candidate, await requestSourceHash("rsvp"));
    return { ok: true, submittedAt: result.submittedAt, idempotent: result.idempotent };
  } catch (error) {
    if (error instanceof ZodError) return { ok: false, code: "RSVP_INVALID", message: "Periksa nama, status kehadiran, jumlah tamu, dan catatan RSVP." };
    if (error instanceof RsvpDomainError) return { ok: false, code: error.code, message: error.message };
    return { ok: false, code: "RSVP_UNAVAILABLE", message: "RSVP belum dapat dikirim. Silakan coba lagi." };
  }
}
