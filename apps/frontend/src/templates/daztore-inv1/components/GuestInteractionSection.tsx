import styles from "../styles.module.css";
import { Reveal } from "./Reveal";

export function GuestInteractionSection() {
  return <section className={`${styles.section} ${styles.interactionSection}`} id="daztore-wishes" aria-labelledby="daztore-wishes-title">
    <Reveal className={styles.interactionPanel}>
      <p className={styles.kicker}>Doa & ucapan</p>
      <h2 id="daztore-wishes-title">Kirim Ucapan</h2>
      <p>Pengiriman ucapan online belum tersedia pada undangan ini.</p>
      <small>Formulir akan tersedia setelah layanan penyimpanan tamu diaktifkan.</small>
    </Reveal>
  </section>;
}
