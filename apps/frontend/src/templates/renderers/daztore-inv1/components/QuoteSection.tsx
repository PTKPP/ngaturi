import type { DaztoreInv1ViewModel } from "../schema";
import styles from "../styles.module.css";
import { ThemeIcon, Wave } from "./Icons";
import { Reveal } from "./Reveal";

export function QuoteSection({ invitation }: { invitation: DaztoreInv1ViewModel }) {
  return <section className={`${styles.section} ${styles.quoteSection}`} id="daztore-quote" aria-labelledby="daztore-quote-title">
    <div className={styles.waveTop}><Wave flip /></div>
    <Reveal className={styles.quoteInner}><ThemeIcon name="heart" /><h2 id="daztore-quote-title">Dalam kasih dan ketenangan</h2>{invitation.content.quote.trim() ? <blockquote>{invitation.content.quote}</blockquote> : null}</Reveal>
    <div className={styles.waveBottom}><Wave /></div>
  </section>;
}
