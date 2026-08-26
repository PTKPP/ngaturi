"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InvitationSchema, InvitationStatusSchema } from "@/domain";
import { requireProfile } from "@/application/auth";
import { InvitationApplicationService } from "@/application/invitation-service";
import { createApplicationRepository } from "@/repositories/supabase";

const versioned = (value: string) => { const [key, raw] = value.split("@"); const version = Number(raw); if (!key || !Number.isInteger(version)) throw new Error("Pilihan versi tidak valid."); return [key, version] as const; };

export async function createInvitationAction(formData: FormData) {
  const actor = await requireProfile();
  const repository = await createApplicationRepository();
  const service = new InvitationApplicationService(repository);
  const [templateKey, templateVersion] = versioned(String(formData.get("template") ?? ""));
  const [themeKey, themeVersion] = versioned(String(formData.get("theme") ?? ""));
  const mode = String(formData.get("routeMode"));
  const invitation = await service.create(actor, {
    title: String(formData.get("title") ?? ""), templateKey, templateVersion, themeKey, themeVersion,
    routeId: mode === "existing" ? String(formData.get("routeId") ?? "") : undefined,
    slug: mode === "new" ? String(formData.get("slug") ?? "") : undefined,
  });
  redirect(`/dashboard/invitations/${invitation.id}/edit`);
}

export async function saveInvitationAction(formData: FormData) {
  const actor = await requireProfile();
  const invitation = InvitationSchema.parse(JSON.parse(String(formData.get("invitation") ?? "{}")));
  const service = new InvitationApplicationService(await createApplicationRepository());
  await service.save(actor, invitation);
  revalidatePath(`/dashboard/invitations/${invitation.id}/edit`);
  revalidatePath(`/dashboard/invitations/${invitation.id}/preview`);
}

export async function switchTemplateAction(formData: FormData) {
  const actor = await requireProfile();
  const [key, version] = versioned(String(formData.get("template") ?? ""));
  const id = String(formData.get("id") ?? "");
  await new InvitationApplicationService(await createApplicationRepository()).switchTemplate(actor, id, key, version, formData.get("confirmDiscard") === "true");
  revalidatePath(`/dashboard/invitations/${id}/edit`);
}

export async function setInvitationStatusAction(formData: FormData) {
  const actor = await requireProfile();
  const id = String(formData.get("id") ?? "");
  const status = InvitationStatusSchema.parse(formData.get("status"));
  await new InvitationApplicationService(await createApplicationRepository()).setStatus(actor, id, status);
  revalidatePath("/dashboard/invitations");
  revalidatePath(`/dashboard/invitations/${id}/edit`);
}
