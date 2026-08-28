"use client";

import { useEffect, useState } from "react";
import type { InvitationEvent } from "@/domain";
import { mapEmbedUrl, normalizeMapUrl, type MapsModule, type NormalizedMap } from "@/invitation-modules/definitions/external-embeds";
import { reportEmbedTelemetry } from "@/lib/embed-telemetry";
import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";
import { Reveal } from "./Reveal";

function MapLocation({ event, map, config }: { event: InvitationEvent; map: NormalizedMap | null; config: MapsModule }) {
  const [requested, setRequested] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const canEmbed = Boolean(map && map.provider === "google_maps" && config.embedEnabled);

  useEffect(() => {
    if (!requested || loaded || failed) return;
    const timeout = window.setTimeout(() => {
      setFailed(true);
      reportEmbedTelemetry("embed_load_failure", "maps", map?.provider);
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [failed, loaded, map?.provider, requested]);

  const failEmbed = () => {
    setFailed(true);
    reportEmbedTelemetry("embed_load_failure", "maps", map?.provider);
  };

  return <Reveal className={styles.mapRow}>
    <div><h3>{event.venueName}</h3><address>{event.address}</address></div>
    {map ? <div className={styles.mapActions}>
      {canEmbed && !requested && !failed ? <button className={styles.primaryAction} type="button" onClick={() => setRequested(true)}>Tampilkan peta</button> : null}
      <a className={styles.secondaryAction} href={map.canonicalUrl} target="_blank" rel="noopener noreferrer" onClick={() => reportEmbedTelemetry("fallback_used", "maps", map.provider)}><ThemeIcon name="map" /><span>{config.label}</span></a>
    </div> : <p className={styles.mapUnavailable}>Link lokasi belum tersedia.</p>}
    {requested && canEmbed && !failed ? <div className={styles.mapFrame} aria-busy={!loaded}>
      {!loaded ? <p className={styles.embedLoading} role="status">Memuat Google Maps...</p> : null}
      <iframe src={mapEmbedUrl(event.address)} title={`Peta ${event.venueName}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setLoaded(true)} onError={failEmbed} />
    </div> : null}
    {failed ? <p className={styles.unavailable} role="status">Peta tidak dapat dimuat. Gunakan tombol {config.label}.</p> : null}
  </Reveal>;
}

export function MapsSection({ events, config }: { events: InvitationEvent[]; config: MapsModule }) {
  if (events.length === 0) return null;
  return <section className={`${styles.section} ${styles.mapsSection}`} id="daztore-maps" aria-labelledby="daztore-maps-title">
    <Reveal className={styles.sectionIntro}><ThemeIcon name="map" /><p className={styles.kicker}>Lokasi acara</p><h2 id="daztore-maps-title">Temukan tempatnya</h2><p>Alamat ditampilkan tanpa memuat layanan peta pihak ketiga.</p></Reveal>
    <div className={styles.mapsGrid}>{events.map((event) => <MapLocation event={event} map={normalizeMapUrl(event.mapUrl)} config={config} key={event.id} />)}</div>
  </section>;
}
