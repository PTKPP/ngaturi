import { z } from "zod";
import { defineModule, stable, textModule } from "./shared";

export const contentModuleDefinitions = {
  cover: defineModule({ id: "cover", name: "Sampul", schema: z.object({ eyebrow: z.string(), title: z.string() }), createDefault: () => ({ eyebrow: "Undangan", title: "Hari Bahagia Kami" }), migrate: stable(z.object({ eyebrow: z.string(), title: z.string() })), editor: "configuration" }),
  greeting: textModule("greeting", "Salam pembuka", "Dengan bahagia kami mengundang Anda."),
  quote: textModule("quote", "Kutipan", ""),
  countdown: defineModule({ id: "countdown", name: "Hitung mundur", schema: z.object({ label: z.string() }), createDefault: () => ({ label: "Menuju hari bahagia" }), migrate: stable(z.object({ label: z.string() })), editor: "configuration" }),
  "love-story": textModule("love-story", "Cerita", ""),
  gift: textModule("gift", "Hadiah", ""),
  maps: defineModule({ id: "maps", name: "Peta", schema: z.object({ label: z.string() }), createDefault: () => ({ label: "Buka peta" }), migrate: stable(z.object({ label: z.string() })), editor: "configuration" }),
  closing: textModule("closing", "Penutup", "Terima kasih atas doa dan kehadiran Anda."),
} as const;
