import { defineModule, configSchema, stable } from "./shared";

export const interactionModuleDefinitions = {
  rsvp: defineModule({ id: "rsvp", name: "RSVP", schema: configSchema, createDefault: () => ({ enabled: true }), migrate: stable(configSchema), editor: "configuration" }),
  wishes: defineModule({ id: "wishes", name: "Ucapan", schema: configSchema, createDefault: () => ({ enabled: true }), migrate: stable(configSchema), editor: "configuration" }),
  "qr-check-in": defineModule({ id: "qr-check-in", name: "QR check-in", schema: configSchema, createDefault: () => ({ enabled: true }), migrate: stable(configSchema), editor: "configuration" }),
} as const;
