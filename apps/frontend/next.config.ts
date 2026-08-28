import type { NextConfig } from "next";
import path from "node:path";

const additionalDevOrigins = process.env.NGATURI_ALLOWED_DEV_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: additionalDevOrigins,
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
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
