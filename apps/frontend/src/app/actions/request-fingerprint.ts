import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

export async function requestSourceHash(namespace: "rsvp" | "wishes") {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = requestHeaders.get("x-real-ip")?.trim() || forwarded || "unknown";
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 300) || "unknown";
  const secret = process.env.GUEST_SUBMISSION_RATE_LIMIT_SECRET
    || process.env.RSVP_RATE_LIMIT_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Konfigurasi fingerprint submission guest belum tersedia.");
  return createHmac("sha256", secret)
    .update(`${namespace}\u001f${address}\u001f${userAgent}`)
    .digest("hex");
}
