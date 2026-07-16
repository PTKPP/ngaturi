import { EventDetails } from "@/templates/shared/components/EventDetails";
import type { InvitationTemplateProps } from "@/templates/types";
import styles from "./styles.module.css";

export function ElegantGoldTemplate({ invitation, preview = false }: InvitationTemplateProps) {
  const { couple, content } = invitation;
  return (
    <main className={styles.page} data-template="elegant-gold@1">
      {preview ? <p className={styles.preview}>Mode preview</p> : null}
      <header className={styles.hero}>
        <p className={styles.eyebrow}>The wedding of</p>
        <h1>{couple.partnerOne.nickname} <span>&amp;</span> {couple.partnerTwo.nickname}</h1>
        <p>{content.openingText}</p>
      </header>
      {content.quote ? <blockquote>{content.quote}</blockquote> : null}
      <section className={styles.couple} aria-label="Pasangan">
        <div><h2>{couple.partnerOne.fullName}</h2><p>{couple.partnerOne.parentNames.join(" · ")}</p></div>
        <span>&amp;</span>
        <div><h2>{couple.partnerTwo.fullName}</h2><p>{couple.partnerTwo.parentNames.join(" · ")}</p></div>
      </section>
      <section className={styles.events}><h2>Rangkaian Acara</h2>{[...invitation.events].sort((a, b) => a.sortOrder - b.sortOrder).map((event) => <EventDetails key={event.id} event={event} />)}</section>
      {content.story ? <section><h2>Cerita Kami</h2><p>{content.story}</p></section> : null}
      {invitation.settings.showGiftInformation && content.giftInformation ? <section><h2>Hadiah</h2><p>{content.giftInformation}</p></section> : null}
      <footer><p>{content.closingText}</p><strong>{couple.partnerOne.nickname} &amp; {couple.partnerTwo.nickname}</strong></footer>
    </main>
  );
}
