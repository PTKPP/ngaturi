"use client";

export type EmbedTelemetryEvent = "invalid_provider_url" | "embed_load_failure" | "fallback_used";
export type EmbedTelemetryModule = "video" | "maps";

export function reportEmbedTelemetry(event: EmbedTelemetryEvent, module: EmbedTelemetryModule, provider: string = "unknown") {
  const payload = {
    scope: "third_party_embed",
    event,
    module,
    provider,
    occurredAt: new Date().toISOString(),
  } as const;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ngaturi:telemetry", { detail: payload }));
  if (process.env.NODE_ENV !== "test") console.warn("[ngaturi.telemetry]", JSON.stringify(payload));
}
