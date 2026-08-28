"use client";

import { useRef, useState } from "react";
import type { GiftBankAccount, GiftEWallet, GiftModule } from "@/invitation-modules/definitions/gift";
import styles from "../styles.module.css";
import { ThemeIcon } from "./Icons";
import { Reveal } from "./Reveal";

export function GiftSection({ gift }: { gift: GiftModule }) {
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const [feedback, setFeedback] = useState("");

  const copy = async (value: string, label: string) => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        copied = true;
      } else if (fallbackRef.current && typeof document.execCommand === "function") {
        fallbackRef.current.value = value;
        fallbackRef.current.select();
        copied = document.execCommand("copy");
      }
    } catch {
      copied = false;
    }
    setFeedback(copied ? `${label} berhasil disalin.` : `${label} belum dapat disalin. Silakan salin secara manual.`);
  };

  const accountCard = (account: GiftBankAccount | GiftEWallet) => <article className={styles.giftAccountCard} key={account.id}>
    <span>{account.type === "bank" ? "Rekening bank" : "E-Wallet"}</span>
    <h3>{account.provider}</h3>
    <code>{account.accountNumber}</code>
    <p>a.n. {account.accountHolder}</p>
    <button className={styles.secondaryAction} type="button" onClick={() => void copy(account.accountNumber, `Nomor ${account.provider}`)}><ThemeIcon name="copy" /><span>Salin nomor</span></button>
  </article>;

  return <section className={`${styles.section} ${styles.giftSection}`} id="daztore-gift" aria-labelledby="daztore-gift-title"><Reveal className={styles.giftCard}>
    <ThemeIcon name="gift" /><p className={styles.kicker}>Love Gift</p><h2 id="daztore-gift-title">Tanda Kasih</h2><p>Doa dan kehadiran Anda adalah hadiah yang berarti bagi kami.</p>
    {gift.legacyText ? <div className={styles.giftLegacy}><p>{gift.legacyText}</p><button className={styles.secondaryAction} type="button" onClick={() => void copy(gift.legacyText, "Informasi hadiah")}><ThemeIcon name="copy" /><span>Salin Informasi Hadiah</span></button></div> : null}
    {gift.bankAccounts.length || gift.eWallets.length ? <div className={styles.giftAccounts}>{gift.bankAccounts.map(accountCard)}{gift.eWallets.map(accountCard)}</div> : null}
    {gift.physicalGift.enabled ? <article className={styles.physicalGiftCard}>
      <span>Hadiah fisik</span><h3>{gift.physicalGift.recipient}</h3><address>{gift.physicalGift.address}</address>
      {gift.physicalGift.note ? <p>{gift.physicalGift.note}</p> : null}
      <button className={styles.secondaryAction} type="button" onClick={() => void copy(gift.physicalGift.address, "Alamat hadiah")}><ThemeIcon name="copy" /><span>Salin alamat</span></button>
    </article> : null}
    <textarea ref={fallbackRef} className={styles.copyFallback} defaultValue="" readOnly tabIndex={-1} aria-hidden="true" />
    <p className={styles.copyFeedback} aria-live="polite">{feedback}</p>
  </Reveal></section>;
}
