import type { WeddingDefaultViewModel } from "../view-model";
import styles from "../styles.module.css";
import { ThemeIcon, Wave } from "./Icons";
import { Reveal } from "./Reveal";

export function QuoteSection({ invitation }: { invitation: WeddingDefaultViewModel }) {
  if (!invitation.content.quote.trim()) return null;
  return <section className={`${styles.section} ${styles.quoteSection}`} id="wedding-default-quote" aria-labelledby="wedding-default-quote-title">
    <div className={styles.waveTop}><Wave flip /></div>
    <Reveal className={styles.quoteInner}><ThemeIcon name="heart" /><h2 id="wedding-default-quote-title">Dalam kasih dan ketenangan</h2><blockquote>{invitation.content.quote}</blockquote></Reveal>
    <div className={styles.waveBottom}><Wave /></div>
  </section>;
}
