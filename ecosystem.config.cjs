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
  ],
};
