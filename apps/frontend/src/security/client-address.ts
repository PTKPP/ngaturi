import "server-only";

import { isIP } from "node:net";
import { trustedProxyHops, type RuntimeEnvironment } from "@/config/production-environment";

type HeaderReader = Pick<Headers, "get">;

export function resolveClientAddress(headers: HeaderReader, env: RuntimeEnvironment = process.env) {
  const hops = trustedProxyHops(env);
  if (!hops) return "unavailable";

  const chain = headers.get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? [];
  const candidate = chain.at(-hops);
  return candidate && isIP(candidate) ? candidate : "unavailable";
}
