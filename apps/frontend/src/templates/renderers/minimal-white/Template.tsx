import { EventDetails } from "@/templates/shared/components/EventDetails";
import type { InvitationTemplateProps } from "@/templates/types";
import styles from "./styles.module.css";
import { themeCssVariables } from "@/themes/registry";
import type { WeddingRenderModel } from "@/invitation-modules/schemas";
import { DefaultInvitationCover } from "@/templates/shared/DefaultInvitationCover";

export function MinimalWhiteTemplate({ invitation, content, theme, preview = false }: InvitationTemplateProps<WeddingRenderModel>) {
  const { couple, copy } = content;
  return (
    <main className={styles.page} data-template="minimal-white@1" data-theme={`${theme.key}@${theme.version}`} style={themeCssVariables(theme)}>
      <DefaultInvitationCover eyebrow="The wedding of" names={`${couple.partnerOne.nickname} + ${couple.partnerTwo.nickname}`} date={content.events[0]?.date} />
      {preview ? <p className={styles.preview}>Preview undangan</p> : null}
      <header className={styles.hero}>
        <p>{invitation.title}</p>
        <h1>{couple.partnerOne.nickname}<span>+</span>{couple.partnerTwo.nickname}</h1>
        <p>{copy.openingText}</p>
      </header>
      <section className={styles.names}>
        <div><small>Partner one</small><h2>{couple.partnerOne.fullName}</h2></div>
        <div><small>Partner two</small><h2>{couple.partnerTwo.fullName}</h2></div>
      </section>
      {copy.quote ? <blockquote>“{copy.quote}”</blockquote> : null}
      <section className={styles.events}><h2>Save the date</h2>{[...content.events].sort((a, b) => a.sortOrder - b.sortOrder).map((event) => <EventDetails key={event.id} event={event} />)}</section>
      {copy.story ? <section><h2>Tentang kami</h2><p>{copy.story}</p></section> : null}
      {content.settings.showGiftInformation && copy.giftInformation ? <section><h2>Hadiah</h2><p>{copy.giftInformation}</p></section> : null}
      <footer><p>{copy.closingText}</p></footer>
    </main>
  );
}
