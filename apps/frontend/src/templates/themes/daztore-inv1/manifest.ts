import { TemplateSchema } from "@/domain";

export const manifest = TemplateSchema.parse({
  key: "daztore-inv1",
  version: 1,
  name: "Daztore Invitation 1",
  description: "Tema pernikahan monokrom bernuansa klasik-Islami dengan cover interaktif, tipografi elegan, countdown, rangkaian acara, dan musik latar.",
  thumbnail: "/templates/daztore-inv1/thumbnail.svg",
  status: "active",
  supportedSections: ["cover", "hero", "couple", "quote", "events", "story", "gallery", "gift", "closing", "audio", "navigation"],
});
