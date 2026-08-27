import { z } from "zod";
import { InvitationEventsSchema } from "../schemas";
import { defineModule, stable } from "./shared";

const eventSchema = z.object({ items: InvitationEventsSchema });
const agendaSchema = z.object({ items: z.array(z.object({ time: z.string(), title: z.string() })) });

export const scheduleModuleDefinitions = {
  event: defineModule({ id: "event", name: "Acara", schema: eventSchema, createDefault: () => ({ items: [{ id: "event-1", type: "reception", title: "Acara", date: "2026-12-01", startTime: "10:00", endTime: "12:00", timezone: "Asia/Jakarta", venueName: "Lokasi Acara", address: "Alamat acara", mapUrl: "", sortOrder: 0 }] }), migrate: stable(eventSchema), editor: "event-list" }),
  agenda: defineModule({ id: "agenda", name: "Agenda", schema: agendaSchema, createDefault: () => ({ items: [] }), migrate: stable(agendaSchema), editor: "configuration" }),
} as const;
