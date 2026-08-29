import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const frontendDirectory = fileURLToPath(new URL("..", import.meta.url));

const output = execFileSync("supabase", ["status", "--workdir", "../..", "-o", "json"], {
  cwd: frontendDirectory, encoding: "utf8", shell: process.platform === "win32",
});
const status = JSON.parse(output.slice(output.indexOf("{")));
assert.ok(["127.0.0.1", "localhost"].includes(new URL(status.API_URL).hostname), "E2E server hanya boleh memakai Supabase lokal.");

const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "npm run dev -- --hostname 127.0.0.1 --port 3100"]
  : ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3100"];
const child = spawn(command, args, {
  cwd: frontendDirectory,
  env: {
    ...process.env,
    NGATURI_NEXT_DIST_DIR: ".next-e2e",
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    GUEST_SUBMISSION_RATE_LIMIT_SECRET: "local-browser-e2e-fingerprint-secret-32-bytes",
    NGATURI_TRUSTED_PROXY_HOPS: "1",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
  },
  stdio: "inherit",
});

const stop = () => { if (!child.killed) child.kill("SIGTERM"); };
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
child.once("exit", (code, signal) => process.exitCode = signal ? 1 : code ?? 1);
