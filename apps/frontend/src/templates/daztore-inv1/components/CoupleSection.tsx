import type { DaztoreInv1ViewModel } from "../view-model";
import { daztoreInv1Assets } from "../assets";
import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";
import { Reveal } from "./Reveal";
import { ThemeImage } from "./ThemeImage";
import type { TemplateMedia } from "@/templates/types";

export function CoupleSection({ invitation, media }: { invitation: DaztoreInv1ViewModel; media: TemplateMedia[] }) {
  const partners = [
    [invitation.couple.partnerOne, daztoreInv1Assets.partnerOnePlaceholder],
    [invitation.couple.partnerTwo, daztoreInv1Assets.partnerTwoPlaceholder],
  ] as const;
  return <section className={styles.section} id="daztore-couple" aria-labelledby="daztore-couple-title">
    <Reveal className={styles.sectionIntro}><p className={styles.kicker}>Dua hati, satu perjalanan</p><h2 id="daztore-couple-title">Mempelai</h2></Reveal>
    <div className={styles.coupleGrid}>{partners.map(([partner, fallback], index) => <Reveal className={styles.partnerCard} key={partner.fullName}>
      <div className={styles.partnerPhoto}><ThemeImage src={partner.photo} fallback={fallback} alt={media.find((item) => item.id === partner.photo)?.altText ?? `Foto ${partner.fullName}`} /></div>
      <p className={styles.partnerNickname}>{partner.nickname}</p>
      <h3>{partner.fullName}</h3>
      {partner.parentNames.length > 0 ? <p>Putra/putri dari<br />{partner.parentNames.join(" & ")}</p> : null}
      {index === 0 ? <span className={styles.coupleAmpersand} aria-hidden="true">&amp;</span> : null}
    </Reveal>)}</div>
    <ThemeIcon name="heart" className={styles.heartOrnament} />
  </section>;
}
