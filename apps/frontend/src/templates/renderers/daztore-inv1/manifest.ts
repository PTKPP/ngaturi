import { TemplateSchema } from "@/domain";

export const manifest = TemplateSchema.parse({
  key: "daztore-inv1",
  version: 1,
  name: "Daztore Invitation 1",
  description: "Template pernikahan monokrom bernuansa klasik-Islami dengan cover interaktif, tipografi elegan, countdown, rangkaian acara, dan musik latar.",
  thumbnail: "/templates/daztore-inv1/thumbnail.svg",
  status: "active",
  categoryKey: "wedding", categoryVersion: 1, activeContentSchemaVersion: 2, themeSchemaVersion: 1,
  supportedModules: ["cover", "greeting", "couple-profile", "quote", "event", "countdown", "love-story", "gallery", "gift", "maps", "closing"],
  requiredModules: ["cover", "couple-profile", "event", "closing"],
  optionalModules: ["gift"],
  defaultEnabledModules: ["greeting", "quote", "countdown", "love-story", "gallery", "maps"],
  sections: [
    { id: "cover", moduleId: "cover", renderer: "daztore-cover" },
    { id: "greeting", moduleId: "greeting", renderer: "daztore-greeting" },
    { id: "couple", moduleId: "couple-profile", renderer: "daztore-couple" },
    { id: "quote", moduleId: "quote", renderer: "daztore-quote" },
    { id: "events", moduleId: "event", renderer: "daztore-events" },
    { id: "countdown", moduleId: "countdown", renderer: "daztore-countdown" },
    { id: "story", moduleId: "love-story", renderer: "daztore-story" },
    { id: "gallery", moduleId: "gallery", renderer: "daztore-gallery" },
    { id: "gift", moduleId: "gift", renderer: "daztore-gift" },
    { id: "maps", moduleId: "maps", renderer: "daztore-maps" },
    { id: "closing", moduleId: "closing", renderer: "daztore-closing" },
  ],
  supportedSections: ["cover", "hero", "couple", "quote", "events", "story", "gallery", "gift", "closing", "audio", "navigation"],
});
