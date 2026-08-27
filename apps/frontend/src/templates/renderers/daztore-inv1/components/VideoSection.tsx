"use client";

import styles from "../styles.module.css";
import { Reveal } from "./Reveal";
import { useInvitationExperience } from "@/templates/shared/InvitationExperienceShell";

function safeVideoEmbed(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      const id = url.searchParams.get("v") ?? (url.pathname.startsWith("/embed/") ? url.pathname.split("/")[2] : "");
      return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (["vimeo.com", "www.vimeo.com"].includes(url.hostname)) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return /^\d{6,12}$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch { return null; }
  return null;
}
export function VideoSection({ url }: { url: string }) {
  const { pauseMusic } = useInvitationExperience();
  if (!url) return null;
  const source = safeVideoEmbed(url);
  return <section className={`${styles.section} ${styles.videoSection}`} id="daztore-video" aria-labelledby="daztore-video-title">
    <Reveal className={styles.readingColumn}>
      <p className={styles.kicker}>Our film</p>
      <h2 id="daztore-video-title">Cerita dalam gambar</h2>
      {source ? <div className={styles.videoFrame} onPointerDownCapture={pauseMusic} onFocusCapture={pauseMusic}>
        <iframe src={source} title="Video perjalanan pasangan" loading="lazy" allow="fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
      </div> : <p className={styles.unavailable}>Sumber video ini belum didukung. Gunakan tautan YouTube atau Vimeo yang valid.</p>}
    </Reveal>
  </section>;
}
