export interface SupabaseEnvironment {
  url: string;
  publishableKey: string;
  serviceRoleKey?: string;
}

export function getSupabaseEnvironment(): SupabaseEnvironment | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

export function requireSupabaseEnvironment(): SupabaseEnvironment {
  const environment = getSupabaseEnvironment();
  if (!environment) throw new Error("Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  return environment;
}
