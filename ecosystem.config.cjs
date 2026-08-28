const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).reduce((values, rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return values;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return values;

    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
    return values;
  }, {});
}

const fileEnv = readEnvFile(path.join(root, ".env"));
const envValue = (key, fallback = "") => process.env[key] || fileEnv[key] || fallback;
const definedValues = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ""));

module.exports = {
  apps: [
    {
      name: "ngaturi-frontend",
      cwd: path.join(root, "apps/frontend"),
      script: path.join(root, "apps/frontend/node_modules/next/dist/bin/next"),
      args: [
        "start",
        "--hostname",
        envValue("FRONTEND_HOST", "0.0.0.0"),
        "--port",
        envValue("FRONTEND_PORT", "3000"),
      ],
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      restart_delay: 2_000,
      min_uptime: "5s",
      max_restarts: 10,
      kill_timeout: 5_000,
      time: true,
      env: definedValues({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: envValue("NEXT_PUBLIC_SUPABASE_URL"),
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: envValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
        SUPABASE_SERVICE_ROLE_KEY: envValue("SUPABASE_SERVICE_ROLE_KEY"),
        NEXT_PUBLIC_SITE_URL: envValue("NEXT_PUBLIC_SITE_URL"),
      }),
    },
    {
      name: "ngaturi-media-cleanup",
      cwd: path.join(root, "apps/frontend"),
      script: process.platform === "win32" ? "npm.cmd" : "npm",
      args: ["run", "media:cleanup:scheduler"],
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      restart_delay: 5_000,
      min_uptime: "10s",
      max_restarts: 10,
      kill_timeout: 30_000,
      time: true,
      env: definedValues({
        NODE_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: envValue("NEXT_PUBLIC_SUPABASE_URL"),
        SUPABASE_SERVICE_ROLE_KEY: envValue("SUPABASE_SERVICE_ROLE_KEY"),
        MEDIA_CLEANUP_ALLOW_REMOTE: envValue("MEDIA_CLEANUP_ALLOW_REMOTE"),
        MEDIA_CLEANUP_INTERVAL_MS: envValue("MEDIA_CLEANUP_INTERVAL_MS", "300000"),
        MEDIA_CLEANUP_BATCH_SIZE: envValue("MEDIA_CLEANUP_BATCH_SIZE", "25"),
        MEDIA_CLEANUP_CONCURRENCY: envValue("MEDIA_CLEANUP_CONCURRENCY", "4"),
        MEDIA_CLEANUP_MAX_BATCHES: envValue("MEDIA_CLEANUP_MAX_BATCHES", "20"),
        MEDIA_CLEANUP_MAX_ATTEMPTS: envValue("MEDIA_CLEANUP_MAX_ATTEMPTS", "8"),
        MEDIA_CLEANUP_LEASE_TIMEOUT: envValue("MEDIA_CLEANUP_LEASE_TIMEOUT", "10 minutes"),
        MEDIA_CLEANUP_RUN_LOCK_LEASE: envValue("MEDIA_CLEANUP_RUN_LOCK_LEASE", "30 minutes"),
        MEDIA_RECONCILE_BATCH_SIZE: envValue("MEDIA_RECONCILE_BATCH_SIZE", "100"),
        MEDIA_UPLOAD_TIMEOUT: envValue("MEDIA_UPLOAD_TIMEOUT", "2 hours"),
        MEDIA_PROCESSING_TIMEOUT: envValue("MEDIA_PROCESSING_TIMEOUT", "1 hour"),
        MEDIA_FAILED_RETENTION: envValue("MEDIA_FAILED_RETENTION", "24 hours"),
        MEDIA_READY_ORPHAN_GRACE: envValue("MEDIA_READY_ORPHAN_GRACE", "7 days"),
        MEDIA_REFERENCE_RECHECK_INTERVAL: envValue("MEDIA_REFERENCE_RECHECK_INTERVAL", "1 hour"),
      }),
    },
  ],
};
