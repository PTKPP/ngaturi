"use client";

import { InvitationOpenButton } from "./InvitationOpenButton";
import { useInvitationExperience } from "./InvitationExperienceShell";
import styles from "./default-invitation-cover.module.css";

export function DefaultInvitationCover({ eyebrow, names, date }: { eyebrow: string; names: string; date?: string }) {
  const { opened } = useInvitationExperience();
  return <section className={styles.cover} data-open={opened ? "false" : "true"} aria-label="Pembuka undangan" aria-hidden={opened}>
    <div className={styles.inner}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1>{names}</h1>
      {date ? <p className={styles.date}>{date}</p> : null}
      <InvitationOpenButton>Buka Undangan</InvitationOpenButton>
    </div>
  </section>;
}
