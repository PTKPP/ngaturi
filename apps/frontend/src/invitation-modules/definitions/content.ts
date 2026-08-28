import { z } from "zod";
import { defineModule, stable, textModule } from "./shared";
import { giftModuleDefinition } from "./gift";
import { MapsModuleSchema } from "./external-embeds";

const legacyMapsSchema = z.object({ label: z.string() });

function migrateMaps(version: number, value: unknown) {
  if (version === 2) return MapsModuleSchema.parse(value);
  if (version !== 1) throw new Error(`Versi modul maps ${version} tidak didukung.`);
  const legacy = legacyMapsSchema.parse(value);
  return MapsModuleSchema.parse({ label: legacy.label || "Buka Maps", embedEnabled: false });
}

export const contentModuleDefinitions = {
  cover: defineModule({ id: "cover", name: "Sampul", schema: z.object({ eyebrow: z.string(), title: z.string() }), createDefault: () => ({ eyebrow: "Undangan", title: "Hari Bahagia Kami" }), migrate: stable(z.object({ eyebrow: z.string(), title: z.string() })), editor: "configuration" }),
  greeting: textModule("greeting", "Salam pembuka", "Dengan bahagia kami mengundang Anda."),
  quote: textModule("quote", "Kutipan", ""),
  countdown: defineModule({ id: "countdown", name: "Hitung mundur", schema: z.object({ label: z.string() }), createDefault: () => ({ label: "Menuju hari bahagia" }), migrate: stable(z.object({ label: z.string() })), editor: "configuration" }),
  "love-story": textModule("love-story", "Cerita", ""),
  gift: giftModuleDefinition,
  maps: defineModule({ id: "maps", version: 2, name: "Peta", schema: MapsModuleSchema, createDefault: () => ({ label: "Buka Maps", embedEnabled: false }), migrate: migrateMaps, editor: "configuration" }),
  closing: textModule("closing", "Penutup", "Terima kasih atas doa dan kehadiran Anda."),
} as const;
