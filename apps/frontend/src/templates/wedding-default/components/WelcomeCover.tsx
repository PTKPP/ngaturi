"use client";

import { useSearchParams } from "next/navigation";
import type { InvitationEvent } from "@/domain";
import type { WeddingDefaultViewModel } from "../view-model";
import { weddingDefaultAssets } from "../assets";
import { formatEventDate } from "../utilities/countdown";
import { sanitizeRecipient } from "../utilities/recipient";
import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";
import { ThemeImage } from "./ThemeImage";
import { InvitationOpenButton } from "@/templates/shared/InvitationOpenButton";
import { useInvitationExperience } from "@/templates/shared/InvitationExperienceShell";

export function WelcomeCover({ invitation, event, eyebrow, title }: {
  invitation: WeddingDefaultViewModel;
  event: InvitationEvent;
  eyebrow: string;
  title: string;
}) {
  const { opened } = useInvitationExperience();
  const recipient = sanitizeRecipient(useSearchParams().get("to"));
  const { partnerOne, partnerTwo } = invitation.couple;
  return <section className={styles.cover} data-open={opened ? "false" : "true"} aria-label="Pembuka undangan" aria-hidden={opened}>
    <div className={styles.coverInner}>
      <p className={styles.coverEyebrow}>{eyebrow}</p>
      <div className={styles.coverPortraits} aria-label={`Foto ${partnerOne.fullName} dan ${partnerTwo.fullName}`}>
        <ThemeImage src={partnerOne.photo} fallback={weddingDefaultAssets.partnerOnePlaceholder} alt={`Foto ${partnerOne.fullName}`} eager />
        <ThemeImage src={partnerTwo.photo} fallback={weddingDefaultAssets.partnerTwoPlaceholder} alt={`Foto ${partnerTwo.fullName}`} eager />
        <ThemeIcon name="heart" />
      </div>
      <h1>{partnerOne.nickname} <span>&amp;</span> {partnerTwo.nickname}</h1>
      <p className={styles.coverTitle}>{title}</p>
      <p className={styles.coverDate}>{formatEventDate(event.date)}</p>
      <div className={styles.recipientBlock}>
        <p className={styles.recipientLabel}>Kepada Yth. Bapak/Ibu/Saudara/i</p>
        <p className={styles.recipient} data-testid="recipient">{recipient}</p>
      </div>
      <InvitationOpenButton><ThemeIcon name="envelope" /><span>Buka Undangan</span></InvitationOpenButton>
    </div>
  </section>;
}
