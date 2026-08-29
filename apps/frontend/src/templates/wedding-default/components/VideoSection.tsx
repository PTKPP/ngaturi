"use client";

import { useEffect, useState } from "react";
import type { VideoModule } from "@/invitation-modules/definitions/external-embeds";
import { videoEmbedUrl, videoExternalUrl } from "@/invitation-modules/definitions/external-embeds";
import { reportEmbedTelemetry } from "@/lib/embed-telemetry";
import { useInvitationExperience } from "@/templates/shared/InvitationExperienceShell";
import styles from "../styles.module.css";
import { Reveal } from "./Reveal";

export function VideoSection({ video }: { video: VideoModule }) {
  const { pauseMusic } = useInvitationExperience();
  const [requested, setRequested] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!requested || loaded || failed) return;
    const timeout = window.setTimeout(() => {
      setFailed(true);
      reportEmbedTelemetry("embed_load_failure", "video", video.provider);
    }, 12_000);
    return () => window.clearTimeout(timeout);
  }, [failed, loaded, requested, video.provider]);

  if (video.provider === "none") return null;
  const externalUrl = videoExternalUrl(video);
  const embedUrl = videoEmbedUrl(video);
  const providerLabel = video.provider === "youtube" ? "YouTube" : "Vimeo";
  const failEmbed = () => {
    setFailed(true);
    reportEmbedTelemetry("embed_load_failure", "video", video.provider);
  };

  return <section className={`${styles.section} ${styles.videoSection}`} id="wedding-default-video" aria-labelledby="wedding-default-video-title">
    <Reveal className={styles.readingColumn}>
      <p className={styles.kicker}>Our film</p>
      <h2 id="wedding-default-video-title">Cerita dalam gambar</h2>
      {!requested || failed || !video.embedEnabled ? <div className={styles.embedConsent}>
        <p>{video.embedEnabled ? `Video ${providerLabel} baru dimuat setelah Anda memilih untuk menampilkannya.` : `Embed ${providerLabel} dinonaktifkan oleh pemilik undangan.`}</p>
        <div className={styles.embedActions}>
          {video.embedEnabled && !failed ? <button className={styles.primaryAction} type="button" onClick={() => { pauseMusic(); setRequested(true); }}>Tampilkan video</button> : null}
          <a className={styles.secondaryAction} href={externalUrl} target="_blank" rel="noopener noreferrer" onClick={() => reportEmbedTelemetry("fallback_used", "video", video.provider)}>Buka di {providerLabel}</a>
        </div>
        {failed ? <p className={styles.unavailable} role="status">Embed tidak dapat dimuat. Gunakan link {providerLabel} untuk menonton.</p> : null}
      </div> : null}
      {requested && video.embedEnabled && !failed ? <div className={styles.videoFrame} aria-busy={!loaded}>
        {!loaded ? <p className={styles.embedLoading} role="status">Memuat video dari {providerLabel}...</p> : null}
        <iframe src={embedUrl} title="Video perjalanan pasangan" loading="lazy" allow="fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onLoad={() => setLoaded(true)} onError={failEmbed} />
        <a className={styles.secondaryAction} href={externalUrl} target="_blank" rel="noopener noreferrer" onClick={() => reportEmbedTelemetry("fallback_used", "video", video.provider)}>Buka di {providerLabel}</a>
      </div> : null}
    </Reveal>
  </section>;
}
