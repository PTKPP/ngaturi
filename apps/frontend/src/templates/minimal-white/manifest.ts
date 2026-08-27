import { TemplateSchema } from "@/domain";

export const manifest = TemplateSchema.parse({
  key: "minimal-white", version: 1, name: "Minimal White",
  description: "Tampilan bersih, lapang, dan modern dengan fokus pada informasi.",
  thumbnail: "/templates/minimal-white.svg", status: "active",
  categoryKey: "wedding", categoryVersion: 1, activeContentSchemaVersion: 2, themeSchemaVersion: 1,
  supportedModules: ["cover", "greeting", "couple-profile", "quote", "event", "love-story", "gift", "music", "closing"],
  requiredModules: ["cover", "couple-profile", "event", "closing"],
  optionalModules: ["gift"],
  defaultEnabledModules: ["greeting", "quote", "love-story", "music"],
  sections: [
    { id: "hero", moduleId: "cover", renderer: "minimal-hero" },
    { id: "greeting", moduleId: "greeting", renderer: "minimal-greeting" },
    { id: "couple", moduleId: "couple-profile", renderer: "minimal-couple" },
    { id: "quote", moduleId: "quote", renderer: "minimal-quote" },
    { id: "events", moduleId: "event", renderer: "minimal-events" },
    { id: "story", moduleId: "love-story", renderer: "minimal-story" },
    { id: "gift", moduleId: "gift", renderer: "minimal-gift" },
    { id: "closing", moduleId: "closing", renderer: "minimal-closing" },
  ],
  supportedSections: ["hero", "couple", "events", "story", "gift", "closing"],
});
