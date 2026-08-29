import { TemplateSchema } from "@/domain";

export const manifest = TemplateSchema.parse({
  key: "plug-and-play-fixture",
  version: 1,
  name: "Plug and Play Fixture",
  description: "Paket lengkap khusus test discovery; tidak masuk registry production.",
  thumbnail: "/templates/plug-and-play-fixture.svg",
  status: "active",
  categoryKey: "wedding",
  categoryVersion: 1,
  activeContentSchemaVersion: 2,
  themeSchemaVersion: 1,
  supportedModules: ["cover", "couple-profile", "event", "closing"],
  requiredModules: ["cover", "couple-profile", "event", "closing"],
  optionalModules: [],
  defaultEnabledModules: [],
  sections: [
    { id: "cover", moduleId: "cover", renderer: "fixture-cover" },
    { id: "couple", moduleId: "couple-profile", renderer: "fixture-couple" },
    { id: "events", moduleId: "event", renderer: "fixture-events" },
    { id: "closing", moduleId: "closing", renderer: "fixture-closing" },
  ],
  supportedSections: ["cover", "couple", "events", "closing"],
});
