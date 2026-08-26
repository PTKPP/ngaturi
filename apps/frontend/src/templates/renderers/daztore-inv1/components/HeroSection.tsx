import type { InvitationEvent } from "@/domain";
import type { DaztoreInv1ViewModel } from "../view-model";
import { daztoreInv1Assets } from "../assets";
import { buildGoogleCalendarUrl } from "../utilities/calendar";
import { formatEventDate } from "../utilities/countdown";
import styles from "../styles.module.css";
import { Countdown } from "./Countdown";
import { ThemeIcon, Wave } from "./Icons";
import { ThemeImage } from "./ThemeImage";

export function HeroSection({ invitation, event }: { invitation: DaztoreInv1ViewModel; event: InvitationEvent }) {
  const { partnerOne, partnerTwo } = invitation.couple;
  return <section className={styles.hero} id="daztore-home" aria-labelledby="daztore-hero-title">
    <div className={styles.heroPortraits}>
      <ThemeImage src={partnerOne.photo} fallback={daztoreInv1Assets.partnerOnePlaceholder} alt={`Foto ${partnerOne.fullName}`} eager />
      <ThemeImage src={partnerTwo.photo} fallback={daztoreInv1Assets.partnerTwoPlaceholder} alt={`Foto ${partnerTwo.fullName}`} eager />
    </div>
    <p className={styles.kicker}>Undangan Pernikahan</p>
    <h2 id="daztore-hero-title">{partnerOne.nickname} <span>&amp;</span> {partnerTwo.nickname}</h2>
    <p className={styles.heroDate}>{formatEventDate(event.date)}</p>
    <Countdown event={event} className={styles.countdown} />
    <a className={styles.primaryAction} href={buildGoogleCalendarUrl(event, invitation.title)} target="_blank" rel="noopener noreferrer"><ThemeIcon name="calendar" /><span>Simpan ke kalender</span></a>
    <a className={styles.scrollIndicator} href="#daztore-couple"><span>Geser untuk melanjutkan</span><span aria-hidden="true">↓</span></a>
    <div className={styles.waveBottom}><Wave /></div>
  </section>;
}
