import { pathToFileURL } from "node:url";
import { validateProductionEnvironment } from "../src/config/production-environment";

export function runProductionEnvironmentCheck(env: NodeJS.ProcessEnv = process.env) {
  const validated = validateProductionEnvironment(env);
  return {
    siteOrigin: validated.siteUrl.origin,
    supabaseOrigin: validated.supabaseUrl.origin,
    trustedProxyHops: validated.trustedProxyHops,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify({ event: "production_environment_valid", ...runProductionEnvironmentCheck() }));
  } catch (error) {
    console.error(JSON.stringify({
      event: "production_environment_invalid",
      error: error instanceof Error ? error.message : "Konfigurasi production tidak valid.",
    }));
    process.exitCode = 1;
  }
}
