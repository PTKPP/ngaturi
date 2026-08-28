import type { InvitationEvent } from "@/domain";
import { normalizeMapUrl } from "@/invitation-modules/definitions/external-embeds";

export function EventDetails({ event }: { event: InvitationEvent }) {
  const safeMapUrl = normalizeMapUrl(event.mapUrl)?.canonicalUrl ?? "";
  return (
    <article>
      <p>{event.title}</p>
      <time dateTime={`${event.date}T${event.startTime}`}>{event.date} · {event.startTime}–{event.endTime} {event.timezone}</time>
      <address>{event.venueName}<br />{event.address}</address>
      {safeMapUrl ? <a href={safeMapUrl} target="_blank" rel="noopener noreferrer">Buka peta</a> : null}
    </article>
  );
}
