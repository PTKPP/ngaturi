import { EventDetails } from "@/templates/shared/components/EventDetails";
import type { InvitationTemplateProps } from "@/templates/types";
import styles from "./styles.module.css";

export function MinimalWhiteTemplate({ invitation, preview = false }: InvitationTemplateProps) {
  const { couple, content } = invitation;
  return (
    <main className={styles.page} data-template="minimal-white@1">
      {preview ? <p className={styles.preview}>Preview undangan</p> : null}
      <header className={styles.hero}>
        <p>{invitation.title}</p>
        <h1>{couple.partnerOne.nickname}<span>+</span>{couple.partnerTwo.nickname}</h1>
        <p>{content.openingText}</p>
      </header>
      <section className={styles.names}>
        <div><small>Partner one</small><h2>{couple.partnerOne.fullName}</h2></div>
        <div><small>Partner two</small><h2>{couple.partnerTwo.fullName}</h2></div>
      </section>
      {content.quote ? <blockquote>“{content.quote}”</blockquote> : null}
      <section className={styles.events}><h2>Save the date</h2>{[...invitation.events].sort((a, b) => a.sortOrder - b.sortOrder).map((event) => <EventDetails key={event.id} event={event} />)}</section>
      {content.story ? <section><h2>Tentang kami</h2><p>{content.story}</p></section> : null}
      {invitation.settings.showGiftInformation && content.giftInformation ? <section><h2>Hadiah</h2><p>{content.giftInformation}</p></section> : null}
      <footer><p>{content.closingText}</p></footer>
    </main>
  );
}
