import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";
import { GET as health } from "@/app/api/health/route";
import { validateProductionEnvironment } from "@/config/production-environment";
import { resolveClientAddress } from "@/security/client-address";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const validEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example_key_123456",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-example-key-123456789",
  GUEST_SUBMISSION_RATE_LIMIT_SECRET: "guest-fingerprint-secret-with-32-characters",
  NEXT_PUBLIC_SITE_URL: "https://undangan.example.com",
  NGATURI_TRUSTED_PROXY_HOPS: "1",
  MEDIA_CLEANUP_ALLOW_REMOTE: "true",
};

describe("production runtime boundary", () => {
  it("fails fast for incomplete or unsafe production environment", () => {
    expect(validateProductionEnvironment(validEnvironment)).toMatchObject({ trustedProxyHops: 1 });
    expect(() => validateProductionEnvironment({ ...validEnvironment, NEXT_PUBLIC_SITE_URL: "http://undangan.example.com" })).toThrow(/HTTPS/);
    expect(() => validateProductionEnvironment({ ...validEnvironment, GUEST_SUBMISSION_RATE_LIMIT_SECRET: "short" })).toThrow(/32 karakter/);
    expect(() => validateProductionEnvironment({ ...validEnvironment, NGATURI_TRUSTED_PROXY_HOPS: "0" })).toThrow(/TRUSTED_PROXY_HOPS/);
    expect(() => validateProductionEnvironment({ ...validEnvironment, MEDIA_CLEANUP_ALLOW_REMOTE: "false" })).toThrow(/ALLOW_REMOTE/);
  });

  it("uses the right edge of a trusted proxy chain and ignores spoofable headers by default", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.9, 203.0.113.20", "x-real-ip": "192.0.2.44" });
    expect(resolveClientAddress(headers, { NGATURI_TRUSTED_PROXY_HOPS: "1" })).toBe("203.0.113.20");
    expect(resolveClientAddress(headers, { NGATURI_TRUSTED_PROXY_HOPS: "2" })).toBe("198.51.100.9");
    expect(resolveClientAddress(headers, {})).toBe("unavailable");
    expect(resolveClientAddress(new Headers({ "x-forwarded-for": "not-an-ip" }), { NGATURI_TRUSTED_PROXY_HOPS: "1" })).toBe("unavailable");
  });

  it("publishes narrow security headers and dependency-neutral liveness", async () => {
    const headerSets = await nextConfig.headers!();
    const headers = Object.fromEntries(headerSets[0].headers.map((header) => [header.key, header.value]));
    expect(headers["Content-Security-Policy"]).toContain("frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com");
    expect(headers).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    const response = health();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("keeps readiness, PM2 startup, and cascade-quota repair explicit", () => {
    const readiness = source("src/app/api/readiness/route.ts");
    const ecosystem = source("../../ecosystem.config.cjs");
    const migration = source("../../supabase/migrations/202608290002_media_quota_cascade_delete.sql");
    expect(readiness).toMatch(/template_catalog|invitation-media|status: "not_ready"/);
    expect(ecosystem).toMatch(/start:production|NGATURI_TRUSTED_PROXY_HOPS|ngaturi-media-cleanup/);
    expect(migration).toMatch(/release_invitation_media_quota_on_delete|invitation_media_hard_quota_release/);
  });
});
