import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function StorySection({ story }: { story: string }) {
  if (!story.trim()) return null;
  return <section className={`${styles.section} ${styles.storySection}`} id="daztore-story" aria-labelledby="daztore-story-title"><Reveal className={styles.storyInner}><ThemeIcon name="heart" /><p className={styles.kicker}>Our Story</p><h2 id="daztore-story-title">Cerita Kami</h2><p>{story}</p></Reveal></section>;
}
