import type { WeddingDefaultViewModel } from "../view-model";
import styles from "../styles.module.css";
import { ThemeIcon, Wave } from "./Icons";
import { Reveal } from "./Reveal";

export function ClosingSection({ invitation }: { invitation: WeddingDefaultViewModel }) {
  const { partnerOne, partnerTwo } = invitation.couple;
  return <footer className={styles.closing} id="wedding-default-closing" aria-labelledby="wedding-default-closing-title"><div className={styles.waveTop}><Wave flip /></div><Reveal className={styles.closingInner}><ThemeIcon name="heart" /><p>{invitation.content.closingText}</p><h2 id="wedding-default-closing-title">{partnerOne.nickname} <span>&amp;</span> {partnerTwo.nickname}</h2><p>Wassalamualaikum Warahmatullahi Wabarakatuh</p><small>Wedding Default · Ngaturi</small></Reveal></footer>;
}
