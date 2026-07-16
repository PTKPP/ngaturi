import { TemplateSchema } from "@/domain";

export const manifest = TemplateSchema.parse({
  key: "elegant-gold", version: 1, name: "Elegant Gold",
  description: "Nuansa hangat dengan aksen emas dan tipografi klasik.",
  thumbnail: "/templates/elegant-gold.svg", status: "active",
  supportedSections: ["hero", "couple", "events", "story", "gift", "closing"],
});
