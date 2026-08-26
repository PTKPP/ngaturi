import { TemplateSchema } from "@/domain";

export const manifest = TemplateSchema.parse({
  key: "elegant-gold", version: 1, name: "Elegant Gold",
  description: "Nuansa hangat dengan aksen emas dan tipografi klasik.",
  thumbnail: "/templates/elegant-gold.svg", status: "active",
  categoryKey: "wedding", categoryVersion: 1, activeContentSchemaVersion: 2, themeSchemaVersion: 1,
  supportedModules: ["cover", "greeting", "couple-profile", "quote", "event", "love-story", "gift", "closing"],
  requiredModules: ["cover", "couple-profile", "event", "closing"],
  optionalModules: ["gift"],
  defaultEnabledModules: ["greeting", "quote", "love-story"],
  sections: [
    { id: "hero", moduleId: "cover", renderer: "gold-hero" },
    { id: "greeting", moduleId: "greeting", renderer: "gold-greeting" },
    { id: "couple", moduleId: "couple-profile", renderer: "gold-couple" },
    { id: "quote", moduleId: "quote", renderer: "gold-quote" },
    { id: "events", moduleId: "event", renderer: "gold-events" },
    { id: "story", moduleId: "love-story", renderer: "gold-story" },
    { id: "gift", moduleId: "gift", renderer: "gold-gift" },
    { id: "closing", moduleId: "closing", renderer: "gold-closing" },
  ],
  supportedSections: ["hero", "couple", "events", "story", "gift", "closing"],
});
