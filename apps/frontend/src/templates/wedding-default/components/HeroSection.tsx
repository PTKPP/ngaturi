import type { InvitationEvent } from "@/domain";
import type { WeddingDefaultViewModel } from "../view-model";
import { weddingDefaultAssets } from "../assets";
import { buildGoogleCalendarUrl } from "../utilities/calendar";
import { formatEventDate } from "../utilities/countdown";
import styles from "../styles.module.css";
import { ThemeIcon, Wave } from "./Icons";
import { ThemeImage } from "./ThemeImage";

export function HeroSection({ invitation, event }: { invitation: WeddingDefaultViewModel; event: InvitationEvent }) {
  const { partnerOne, partnerTwo } = invitation.couple;
  return <section className={styles.hero} id="wedding-default-home" aria-labelledby="wedding-default-hero-title">
    <div className={styles.heroPortraits}>
      <ThemeImage src={partnerOne.photo} fallback={weddingDefaultAssets.partnerOnePlaceholder} alt={`Foto ${partnerOne.fullName}`} eager />
      <ThemeImage src={partnerTwo.photo} fallback={weddingDefaultAssets.partnerTwoPlaceholder} alt={`Foto ${partnerTwo.fullName}`} eager />
    </div>
    <p className={styles.kicker}>Undangan Pernikahan</p>
    <h2 id="wedding-default-hero-title">{partnerOne.nickname} <span>&amp;</span> {partnerTwo.nickname}</h2>
    <p className={styles.heroDate}>{formatEventDate(event.date)}</p>
    <a className={styles.primaryAction} href={buildGoogleCalendarUrl(event, invitation.title)} target="_blank" rel="noopener noreferrer"><ThemeIcon name="calendar" /><span>Simpan ke kalender</span></a>
    <a className={styles.scrollIndicator} href="#wedding-default-greeting"><span>Geser untuk melanjutkan</span><span aria-hidden="true">↓</span></a>
    <div className={styles.waveBottom}><Wave /></div>
  </section>;
}
