"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/application/auth";
import { AdminApplicationService } from "@/application/admin-service";
import { createApplicationRepository } from "@/repositories/supabase";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function createUserAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "user";
  const routeQuota = Number(formData.get("routeQuota"));
  if (name.length < 2 || password.length < 12 || !Number.isInteger(routeQuota) || routeQuota < 0) throw new Error("Data user tidak valid; password minimal 12 karakter.");
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error || !data.user) throw new Error(error?.message ?? "User gagal dibuat.");
  const { error: updateError } = await admin.from("profiles").update({ role, route_quota: routeQuota }).eq("id", data.user.id);
  if (updateError) { await admin.auth.admin.deleteUser(data.user.id); throw new Error(updateError.message); }
  revalidatePath("/admin/users");
}

export async function setQuotaAction(formData: FormData) {
  const actor = await requireAdmin();
  await new AdminApplicationService(await createApplicationRepository()).setQuota(actor, String(formData.get("ownerId") ?? ""), Number(formData.get("quota")));
  revalidatePath("/admin/users");
}

export async function setAccountStatusAction(formData: FormData) {
  const actor = await requireAdmin();
  const ownerId = String(formData.get("ownerId") ?? "");
  const status = formData.get("status") === "inactive" ? "inactive" : "active";
  if (actor.id === ownerId && status === "inactive") throw new Error("Admin tidak dapat menonaktifkan akunnya sendiri.");
  const { error } = await createAdminSupabaseClient().from("profiles").update({ status }).eq("id", ownerId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

export async function preassignRouteAction(formData: FormData) {
  const actor = await requireAdmin();
  const ownerId = String(formData.get("ownerId") ?? "");
  await new AdminApplicationService(await createApplicationRepository()).preassign(actor, ownerId, String(formData.get("slug") ?? ""));
  revalidatePath(`/admin/users/${ownerId}/routes`);
}

export async function reassignRouteAction(formData: FormData) {
  const actor = await requireAdmin();
  const ownerId = String(formData.get("ownerId") ?? "");
  await new AdminApplicationService(await createApplicationRepository()).reassign(actor, String(formData.get("routeId") ?? ""), String(formData.get("slug") ?? ""), formData.get("confirm") === "on");
  revalidatePath(`/admin/users/${ownerId}/routes`);
}
