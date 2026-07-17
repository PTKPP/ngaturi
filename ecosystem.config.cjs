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
      name: "ngaturi-backend",
      cwd: path.join(root, "apps/backend"),
      script: path.join(root, ".runtime/ngaturi-api"),
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      restart_delay: 2_000,
      min_uptime: "5s",
      max_restarts: 10,
      kill_timeout: 5_000,
      time: true,
      env: definedValues({
        DATABASE_URL: envValue("DATABASE_URL"),
        JWT_SECRET: envValue("JWT_SECRET"),
        HTTP_ADDR: envValue("HTTP_ADDR", ":8080"),
        ACCESS_TOKEN_TTL: envValue("ACCESS_TOKEN_TTL", "15m"),
        REFRESH_TOKEN_TTL: envValue("REFRESH_TOKEN_TTL", "720h"),
      }),
    },
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
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
