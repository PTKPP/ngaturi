import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requireSupabaseEnvironment } from "@/config/supabase";

export function createAdminSupabaseClient() {
  const environment = requireSupabaseEnvironment();
  if (!environment.serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY diperlukan untuk operasi admin server dan media publik.");
  return createClient(environment.url, environment.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
