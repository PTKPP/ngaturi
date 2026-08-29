import "server-only";

export type RuntimeEnvironment = Record<string, string | undefined>;

export interface ProductionEnvironment {
  supabaseUrl: URL;
  siteUrl: URL;
  trustedProxyHops: number;
}

function required(env: RuntimeEnvironment, key: string) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} wajib diisi.`);
  return value;
}

function httpsUrl(env: RuntimeEnvironment, key: string) {
  const value = required(env, key);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${key} harus berupa URL absolut yang valid.`);
  }
  if (parsed.protocol !== "https:") throw new Error(`${key} production wajib memakai HTTPS.`);
  if (parsed.username || parsed.password) throw new Error(`${key} tidak boleh memuat credential.`);
  return parsed;
}

export function trustedProxyHops(env: RuntimeEnvironment = process.env) {
  const raw = env.NGATURI_TRUSTED_PROXY_HOPS?.trim() ?? "0";
  if (!/^\d+$/.test(raw)) return 0;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 1 && value <= 10 ? value : 0;
}

export function validateProductionEnvironment(env: RuntimeEnvironment = process.env): ProductionEnvironment {
  const supabaseUrl = httpsUrl(env, "NEXT_PUBLIC_SUPABASE_URL");
  const siteUrl = httpsUrl(env, "NEXT_PUBLIC_SITE_URL");
  const publishableKey = required(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = required(env, "SUPABASE_SERVICE_ROLE_KEY");
  const fingerprintSecret = required(env, "GUEST_SUBMISSION_RATE_LIMIT_SECRET");
  const proxyHops = trustedProxyHops(env);

  if (publishableKey.length < 20) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tidak valid.");
  if (serviceRoleKey.length < 20) throw new Error("SUPABASE_SERVICE_ROLE_KEY tidak valid.");
  if (publishableKey === serviceRoleKey) throw new Error("Publishable key dan service-role key tidak boleh sama.");
  if (fingerprintSecret.length < 32) throw new Error("GUEST_SUBMISSION_RATE_LIMIT_SECRET minimal 32 karakter acak.");
  if (fingerprintSecret === serviceRoleKey) throw new Error("Secret fingerprint guest harus terpisah dari service-role key.");
  if (siteUrl.pathname !== "/" || siteUrl.search || siteUrl.hash) throw new Error("NEXT_PUBLIC_SITE_URL harus berupa origin tanpa path, query, atau fragment.");
  if (!proxyHops) throw new Error("NGATURI_TRUSTED_PROXY_HOPS wajib berupa integer 1-10 di production.");
  if (env.MEDIA_CLEANUP_ALLOW_REMOTE !== "true") throw new Error("MEDIA_CLEANUP_ALLOW_REMOTE=true wajib dikonfirmasi untuk scheduler production.");

  return { supabaseUrl, siteUrl, trustedProxyHops: proxyHops };
}
