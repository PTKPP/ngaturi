import type { InvitationEvent } from "@/domain";
import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function MapsSection({ events, label }: { events: InvitationEvent[]; label: string }) {
  const locations = events.filter((event) => /^https:\/\//i.test(event.mapUrl));
  if (locations.length === 0) return null;
  return <section className={`${styles.section} ${styles.mapsSection}`} id="daztore-maps" aria-labelledby="daztore-maps-title">
    <Reveal className={styles.sectionIntro}><ThemeIcon name="map" /><p className={styles.kicker}>Lokasi acara</p><h2 id="daztore-maps-title">Temukan tempatnya</h2></Reveal>
    <div className={styles.mapsGrid}>{locations.map((event) => <Reveal className={styles.mapRow} key={event.id}>
      <div><h3>{event.venueName}</h3><address>{event.address}</address></div>
      <a className={styles.secondaryAction} href={event.mapUrl} target="_blank" rel="noopener noreferrer"><ThemeIcon name="map" /><span>{label || "Buka Google Maps"}</span></a>
    </Reveal>)}</div>
  </section>;
}
