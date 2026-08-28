import type { InvitationEvent } from "@/domain";
import { normalizeMapUrl } from "@/invitation-modules/definitions/external-embeds";
import { formatEventDate } from "../utilities/countdown";
import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function EventSection({ events, showMapLinks }: { events: InvitationEvent[]; showMapLinks: boolean }) {
  return <section className={styles.section} id="daztore-events" aria-labelledby="daztore-events-title"><Reveal className={styles.sectionIntro}><p className={styles.kicker}>Rangkaian Acara</p><h2 id="daztore-events-title">Waktu &amp; Tempat</h2><p>Dengan penuh kebahagiaan, kami mengundang Anda untuk hadir dalam rangkaian hari istimewa kami.</p></Reveal><div className={styles.eventGrid}>{events.map((event) => {
    const safeMapUrl = showMapLinks ? normalizeMapUrl(event.mapUrl)?.canonicalUrl ?? "" : "";
    return <Reveal className={styles.eventCard} key={event.id}><p className={styles.eventType}>{event.type}</p><h3>{event.title}</h3><p className={styles.eventDate}>{formatEventDate(event.date)}</p><p>{event.startTime}–{event.endTime}<br /><small>{event.timezone}</small></p><hr /><strong>{event.venueName}</strong><address>{event.address}</address>{safeMapUrl ? <a className={styles.secondaryAction} href={safeMapUrl} target="_blank" rel="noopener noreferrer"><ThemeIcon name="map" /><span>Buka Google Maps</span></a> : null}</Reveal>;
  })}</div></section>;
}
