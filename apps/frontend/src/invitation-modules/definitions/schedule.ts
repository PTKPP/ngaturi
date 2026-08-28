import { z } from "zod";
import { InvitationEventsSchema, LegacyInvitationEventsSchema } from "../schemas";
import { defineModule, stable } from "./shared";
import { normalizeMapUrl } from "./external-embeds";

const eventSchema = z.object({ items: InvitationEventsSchema });
const legacyEventSchema = z.object({ items: LegacyInvitationEventsSchema });
const agendaSchema = z.object({ items: z.array(z.object({ time: z.string(), title: z.string() })) });

function migrateEvents(version: number, value: unknown) {
  if (version === 2) return eventSchema.parse(value);
  if (version !== 1) throw new Error(`Versi modul event ${version} tidak didukung.`);
  const legacy = legacyEventSchema.parse(value);
  return eventSchema.parse({ items: legacy.items.map((event) => {
    const normalized = normalizeMapUrl(event.mapUrl);
    return {
      ...event,
      mapUrl: normalized?.canonicalUrl ?? "",
      legacyUnsupportedMapUrl: event.mapUrl && !normalized ? event.mapUrl : "",
    };
  }) });
}

export const scheduleModuleDefinitions = {
  event: defineModule({ id: "event", version: 2, name: "Acara", schema: eventSchema, createDefault: () => ({ items: [{ id: "event-1", type: "reception", title: "Acara", date: "2026-12-01", startTime: "10:00", endTime: "12:00", timezone: "Asia/Jakarta", venueName: "Lokasi Acara", address: "Alamat acara", mapUrl: "", legacyUnsupportedMapUrl: "", sortOrder: 0 }] }), migrate: migrateEvents, editor: "event-list" }),
  agenda: defineModule({ id: "agenda", name: "Agenda", schema: agendaSchema, createDefault: () => ({ items: [] }), migrate: stable(agendaSchema), editor: "configuration" }),
} as const;
