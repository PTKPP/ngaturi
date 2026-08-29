import type { NextConfig } from "next";
import path from "node:path";

const additionalDevOrigins = process.env.NGATURI_ALLOWED_DEV_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];

const contentSecurityPolicy = [
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  distDir: process.env.NGATURI_NEXT_DIST_DIR || ".next",
  allowedDevOrigins: additionalDevOrigins,
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    localPatterns: [
      {
        pathname: "/api/public-media/**",
        search: "?variant=thumbnail",
      },
      {
        pathname: "/api/public-media/**",
        search: "?variant=medium",
      },
      {
        pathname: "/api/public-media/**",
        search: "?variant=large",
      },
    ],
  },
};

export default nextConfig;
