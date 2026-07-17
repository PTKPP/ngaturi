"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Invitation } from "@/domain";
import { daztoreInv1Assets } from "../assets";
import { sanitizeRecipient } from "../utilities/recipient";
import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";
import { ThemeImage } from "./ThemeImage";

export function WelcomeCover({ invitation, open, onOpen }: { invitation: Invitation; open: boolean; onOpen(): void }) {
  const searchParams = useSearchParams();
  const recipient = sanitizeRecipient(searchParams.get("to"));

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const { partnerOne, partnerTwo } = invitation.couple;
  return <section className={styles.cover} data-open={open ? "true" : "false"} aria-label="Pembuka undangan" aria-hidden={!open}>
    <div className={styles.coverInner}>
      <p className={styles.coverLabel}>The Wedding Of</p>
      <div className={styles.coverPortraits} aria-label={`Foto ${partnerOne.fullName} dan ${partnerTwo.fullName}`}>
        <ThemeImage src={partnerOne.photo} fallback={daztoreInv1Assets.partnerOnePlaceholder} alt={`Foto ${partnerOne.fullName}`} eager />
        <ThemeImage src={partnerTwo.photo} fallback={daztoreInv1Assets.partnerTwoPlaceholder} alt={`Foto ${partnerTwo.fullName}`} eager />
        <ThemeIcon name="heart" />
      </div>
      <h1>{partnerOne.nickname} <span>&amp;</span> {partnerTwo.nickname}</h1>
      <p className={styles.recipientLabel}>Kepada Yth. Bapak/Ibu/Saudara/i</p>
      <p className={styles.recipient} data-testid="recipient">{recipient}</p>
      <button type="button" onClick={onOpen}><ThemeIcon name="envelope" /><span>Buka Undangan</span></button>
    </div>
  </section>;
}
