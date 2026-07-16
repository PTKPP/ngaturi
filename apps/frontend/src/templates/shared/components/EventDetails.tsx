import type { InvitationEvent } from "@/domain";

export function EventDetails({ event }: { event: InvitationEvent }) {
  return (
    <article>
      <p>{event.title}</p>
      <time dateTime={`${event.date}T${event.startTime}`}>{event.date} · {event.startTime}–{event.endTime} {event.timezone}</time>
      <address>{event.venueName}<br />{event.address}</address>
      {event.mapUrl ? <a href={event.mapUrl} target="_blank" rel="noreferrer">Buka peta</a> : null}
    </article>
  );
}
