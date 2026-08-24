import { TemplateSchema } from "@/domain";

export const manifest = TemplateSchema.parse({
  key: "minimal-white", version: 1, name: "Minimal White",
  description: "Tampilan bersih, lapang, dan modern dengan fokus pada informasi.",
  thumbnail: "/templates/minimal-white.svg", status: "active",
  supportedSections: ["hero", "couple", "events", "story", "gift", "closing"],
});
