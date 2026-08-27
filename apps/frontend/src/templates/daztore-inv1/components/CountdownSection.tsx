import type { InvitationEvent } from "@/domain";
import styles from "../styles.module.css";
import { Countdown } from "./Countdown";
import { Reveal } from "./Reveal";

export function CountdownSection({ event, label }: { event: InvitationEvent; label: string }) {
  return <section className={`${styles.section} ${styles.countdownSection}`} id="daztore-countdown" aria-labelledby="daztore-countdown-title">
    <Reveal className={styles.readingColumn}>
      <p className={styles.kicker}>Save the date</p>
      <h2 id="daztore-countdown-title">{label || "Menuju hari bahagia"}</h2>
      <Countdown event={event} className={styles.countdown} />
    </Reveal>
  </section>;
}
