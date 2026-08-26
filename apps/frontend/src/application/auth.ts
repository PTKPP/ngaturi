import "server-only";

import type { User } from "@/domain";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function currentProfile(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const subject = claimsData?.claims?.sub;
  if (claimsError || typeof subject !== "string") return null;
  const { data, error } = await supabase.from("profiles").select("id,name,email,role,status,route_quota,created_at,updated_at").eq("id", subject).single();
  if (error || !data || data.status !== "active") return null;
  return { id: data.id, name: data.name, email: data.email, role: data.role, status: data.status, routeQuota: data.route_quota, createdAt: data.created_at, updatedAt: data.updated_at };
}

export async function requireProfile(): Promise<User> {
  const profile = await currentProfile();
  if (!profile) throw new Error("Autentikasi diperlukan.");
  return profile;
}

export async function requireAdmin(): Promise<User> {
  const profile = await requireProfile();
  if (profile.role !== "admin") throw new Error("Operasi ini hanya dapat dilakukan admin.");
  return profile;
}
