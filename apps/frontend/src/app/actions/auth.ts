"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent("Email atau password salah.")}`);
  const { data } = await supabase.from("profiles").select("role,status").single();
  if (!data || data.status !== "active") { await supabase.auth.signOut(); redirect(`/login?error=${encodeURIComponent("Akun tidak aktif.")}`); }
  redirect(data.role === "admin" ? "/admin" : "/dashboard");
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
