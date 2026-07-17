"use client";

import { useRef, useState } from "react";
import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function GiftSection({ information }: { information: string }) {
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const [feedback, setFeedback] = useState("");

  const copy = async () => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(information);
        copied = true;
      } else if (fallbackRef.current && typeof document.execCommand === "function") {
        fallbackRef.current.select();
        copied = document.execCommand("copy");
      }
    } catch {
      copied = false;
    }
    setFeedback(copied ? "Informasi hadiah berhasil disalin." : "Informasi belum dapat disalin. Silakan pilih teks secara manual.");
  };

  return <section className={`${styles.section} ${styles.giftSection}`} id="daztore-gift" aria-labelledby="daztore-gift-title"><Reveal className={styles.giftCard}><ThemeIcon name="gift" /><p className={styles.kicker}>Love Gift</p><h2 id="daztore-gift-title">Tanda Kasih</h2><p>Doa dan kehadiran Anda adalah hadiah yang berarti bagi kami.</p><div className={styles.giftInformation}>{information}</div><button className={styles.primaryAction} type="button" onClick={copy}><ThemeIcon name="copy" /><span>Salin Informasi Hadiah</span></button><textarea ref={fallbackRef} className={styles.copyFallback} value={information} readOnly tabIndex={-1} aria-hidden="true" /><p className={styles.copyFeedback} aria-live="polite">{feedback}</p></Reveal></section>;
}
