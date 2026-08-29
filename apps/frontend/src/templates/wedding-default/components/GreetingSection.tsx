import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function GreetingSection({ text }: { text: string }) {
  if (!text.trim()) return null;
  return <section className={`${styles.section} ${styles.greetingSection}`} id="wedding-default-greeting" aria-labelledby="wedding-default-greeting-title">
    <Reveal className={styles.readingColumn}>
      <ThemeIcon name="heart" />
      <p className={styles.kicker}>Salam hangat</p>
      <h2 id="wedding-default-greeting-title">Dengan penuh kebahagiaan</h2>
      <p>{text}</p>
      <span className={styles.ornamentDivider} aria-hidden="true" />
    </Reveal>
  </section>;
}
