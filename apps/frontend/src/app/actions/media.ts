"use server";

import type { CompletedImageObject, ImageUploadDescriptor } from "@/repositories/contracts";
import { requireProfile } from "@/application/auth";
import { InvitationMediaService } from "@/application/media-service";
import { createInvitationMediaRepository } from "@/repositories/supabase";

async function service() {
  return new InvitationMediaService(await createInvitationMediaRepository());
}

export async function prepareImageUploadAction(invitationId: string, descriptor: ImageUploadDescriptor) {
  return (await service()).prepareImageUpload(await requireProfile(), invitationId, descriptor);
}

export async function finalizeImageUploadAction(invitationId: string, mediaId: string, objects: CompletedImageObject[]) {
  return (await service()).finalizeImageUpload(await requireProfile(), invitationId, mediaId, objects);
}

export async function failImageUploadAction(invitationId: string, mediaId: string, reason: string) {
  await (await service()).failImageUpload(await requireProfile(), invitationId, mediaId, reason);
}

export async function updateImageAltAction(invitationId: string, mediaId: string, altText: string) {
  return (await service()).updateImageAlt(await requireProfile(), invitationId, mediaId, altText);
}
