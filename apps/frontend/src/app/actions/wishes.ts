"use server";

import { ZodError } from "zod";
import { requireProfile } from "@/application/auth";
import { InvitationWishService } from "@/application/wish-service";
import { WishDomainError, type OwnedWishRecord, type PublicWishRecord, type WishSummary } from "@/repositories/contracts";
import { createInvitationWishRepository } from "@/repositories/supabase";
import type { WishStatus } from "@/wishes/schema";
import { requestSourceHash } from "./request-fingerprint";

export type SubmitWishActionResult =
  | { ok: true; submittedAt: string; idempotent: boolean }
  | { ok: false; code: string; message: string };

export type PublicWishListActionResult =
  | { ok: true; items: PublicWishRecord[]; nextCursor: { createdAt: string; id: string } | null }
  | { ok: false; code: string; message: string };

export type OwnedWishListActionResult =
  | { ok: true; summary: WishSummary; wishes: OwnedWishRecord[]; status: WishStatus; offset: number }
  | { ok: false; code: string; message: string };

export type ModerateWishActionResult =
  | { ok: true; id: string; status: "approved" | "rejected"; updatedAt: string }
  | { ok: false; code: string; message: string };

const service = () => new InvitationWishService(createInvitationWishRepository());

function failure(error: unknown, invalidMessage: string) {
  if (error instanceof ZodError) return { ok: false as const, code: "WISH_INVALID", message: invalidMessage };
  if (error instanceof WishDomainError) return { ok: false as const, code: error.code, message: error.message };
  return { ok: false as const, code: "WISH_UNAVAILABLE", message: "Layanan ucapan belum tersedia. Silakan coba lagi." };
}

export async function submitWishAction(candidate: unknown): Promise<SubmitWishActionResult> {
  try {
    const result = await service().submitGuest(candidate, await requestSourceHash("wishes"));
    return { ok: true, submittedAt: result.submittedAt, idempotent: result.idempotent };
  } catch (error) {
    return failure(error, "Periksa nama dan isi ucapan Anda.");
  }
}

export async function listApprovedWishesAction(candidate: unknown): Promise<PublicWishListActionResult> {
  try {
    return { ok: true, ...await service().listPublic(candidate) };
  } catch (error) {
    return failure(error, "Permintaan daftar ucapan tidak valid.");
  }
}

export async function listOwnedWishesAction(candidate: unknown): Promise<OwnedWishListActionResult> {
  try {
    const actor = await requireProfile();
    const input = candidate as { invitationId?: unknown; status?: unknown; offset?: unknown };
    return { ok: true, ...await service().getOwnerDashboard(actor, String(input?.invitationId ?? ""), input?.status as WishStatus, Number(input?.offset ?? 0)) };
  } catch (error) {
    return failure(error, "Filter moderasi ucapan tidak valid.");
  }
}

export async function moderateWishAction(candidate: unknown): Promise<ModerateWishActionResult> {
  try {
    const actor = await requireProfile();
    const result = await service().moderate(actor, candidate);
    return { ok: true, id: result.id, status: result.status, updatedAt: result.updatedAt };
  } catch (error) {
    return failure(error, "Permintaan moderasi ucapan tidak valid.");
  }
}
