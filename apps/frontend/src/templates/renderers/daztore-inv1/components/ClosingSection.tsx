import type { DaztoreInv1ViewModel } from "../view-model";
import styles from "../styles.module.css";
import { ThemeIcon, Wave } from "./Icons";
import { Reveal } from "./Reveal";

export function ClosingSection({ invitation }: { invitation: DaztoreInv1ViewModel }) {
  const { partnerOne, partnerTwo } = invitation.couple;
  return <footer className={styles.closing} id="daztore-closing" aria-labelledby="daztore-closing-title"><div className={styles.waveTop}><Wave flip /></div><Reveal className={styles.closingInner}><ThemeIcon name="heart" /><p>{invitation.content.closingText}</p><h2 id="daztore-closing-title">{partnerOne.nickname} <span>&amp;</span> {partnerTwo.nickname}</h2><p>Wassalamualaikum Warahmatullahi Wabarakatuh</p><small>Daztore Invitation 1 · Ngaturi</small></Reveal></footer>;
}
