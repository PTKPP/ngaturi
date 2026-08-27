import styles from "../styles.module.css";
import { Reveal } from "./Reveal";

export function GuestInteractionSection({ kind }: { kind: "rsvp" | "wishes" }) {
  const isRsvp = kind === "rsvp";
  return <section className={`${styles.section} ${styles.interactionSection}`} id={`daztore-${kind}`} aria-labelledby={`daztore-${kind}-title`}>
    <Reveal className={styles.interactionPanel}>
      <p className={styles.kicker}>{isRsvp ? "Konfirmasi kehadiran" : "Doa & ucapan"}</p>
      <h2 id={`daztore-${kind}-title`}>{isRsvp ? "RSVP" : "Kirim Ucapan"}</h2>
      <p>{isRsvp ? "Konfirmasi kehadiran online belum tersedia pada undangan ini." : "Pengiriman ucapan online belum tersedia pada undangan ini."}</p>
      <small>Formulir akan tersedia setelah layanan penyimpanan tamu diaktifkan.</small>
    </Reveal>
  </section>;
}
