import type { InvitationEvent } from "@/domain";

export function buildGoogleCalendarUrl(event: InvitationEvent, invitationTitle: string): string {
  const parameters = new URLSearchParams({
    action: "TEMPLATE",
    text: `${event.title} — ${invitationTitle}`,
    dates: `${calendarDateTime(event.date, event.startTime)}/${calendarDateTime(event.date, event.endTime)}`,
    ctz: event.timezone,
    details: invitationTitle,
    location: [event.venueName, event.address].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${parameters.toString()}`;
}

function calendarDateTime(date: string, time: string): string {
  return `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
}
