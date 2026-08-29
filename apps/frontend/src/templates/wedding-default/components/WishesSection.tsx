"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  listApprovedWishesAction,
  submitWishAction,
  type PublicWishListActionResult,
  type SubmitWishActionResult,
} from "@/app/actions/wishes";
import type { PublicWishRecord } from "@/wishes/schema";
import styles from "../styles.module.css";
import { Reveal } from "./Reveal";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
type Cursor = { createdAt: string; id: string };

export function WishesSection({ invitationId, preview = false }: { invitationId: string; preview?: boolean }) {
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [submitResult, setSubmitResult] = useState<SubmitWishActionResult | null>(null);
  const [wishes, setWishes] = useState<PublicWishRecord[]>([]);
  const [cursor, setCursor] = useState<Cursor | null>(null);
  const [listResult, setListResult] = useState<PublicWishListActionResult | null>(null);
  const [loadingList, setLoadingList] = useState(!preview);
  const [submitting, startSubmit] = useTransition();
  const submissionId = useRef<string | null>(null);

  const applyListResult = useCallback((result: PublicWishListActionResult, nextCursor: Cursor | null) => {
    setListResult(result);
    if (result.ok) {
      setWishes((current) => {
        const combined = nextCursor ? [...current, ...result.items] : result.items;
        return [...new Map(combined.map((wish) => [wish.id, wish])).values()];
      });
      setCursor(result.nextCursor);
    }
    setLoadingList(false);
  }, []);

  const load = useCallback(async (nextCursor: Cursor | null = null) => {
    if (preview) return;
    setLoadingList(true);
    const result = await listApprovedWishesAction({ invitationId, cursor: nextCursor });
    applyListResult(result, nextCursor);
  }, [applyListResult, invitationId, preview]);

  useEffect(() => {
    if (preview) return;
    let active = true;
    void listApprovedWishesAction({ invitationId, cursor: null }).then((result) => {
      if (active) applyListResult(result, null);
    });
    return () => { active = false; };
  }, [applyListResult, invitationId, preview]);

  const changed = () => {
    if (submitResult && !submitResult.ok) submissionId.current = null;
    setSubmitResult(null);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (preview || submitting || submitResult?.ok) return;
    submissionId.current ??= crypto.randomUUID();
    startSubmit(async () => setSubmitResult(await submitWishAction({
      invitationId,
      clientSubmissionId: submissionId.current,
      guestName,
      message,
      website,
    })));
  };

  return <section className={`${styles.section} ${styles.interactionSection}`} id="wedding-default-wishes" aria-labelledby="wedding-default-wishes-title">
    <Reveal className={styles.interactionPanel}>
      <p className={styles.kicker}>Doa & ucapan</p>
      <h2 id="wedding-default-wishes-title">Kirim Ucapan</h2>
      <p>Bagikan doa dan pesan terbaik Anda. Ucapan akan tampil setelah disetujui pemilik undangan.</p>
      {submitResult?.ok ? <div className={styles.rsvpSuccess} role="status">
        <strong>Terima kasih, ucapan Anda sudah dikirim.</strong>
        <span>Ucapan akan tampil setelah melalui moderasi.</span>
      </div> : <form className={styles.rsvpForm} onSubmit={submit} noValidate>
        <label className={styles.rsvpField}><span>Nama</span><input value={guestName} minLength={2} maxLength={100} autoComplete="name" required disabled={preview || submitting} onChange={(event) => { changed(); setGuestName(event.target.value); }} /></label>
        <label className={styles.rsvpField}><span>Ucapan</span><textarea value={message} minLength={2} maxLength={1000} rows={5} required disabled={preview || submitting} onChange={(event) => { changed(); setMessage(event.target.value); }} /></label>
        <label className={styles.rsvpHoneypot} aria-hidden="true">Website<input value={website} tabIndex={-1} autoComplete="off" onChange={(event) => setWebsite(event.target.value)} /></label>
        {preview ? <p className={styles.rsvpNotice}>Submission dan daftar public dinonaktifkan pada preview owner.</p> : null}
        {submitResult && !submitResult.ok ? <p className={styles.rsvpError} role="alert">{submitResult.message}</p> : null}
        <button className={styles.primaryAction} type="submit" disabled={preview || submitting}>{submitting ? "Mengirim…" : "Kirim Ucapan"}</button>
      </form>}

      <div className={styles.wishPublicList} aria-live="polite">
        <h3>Ucapan Terbaru</h3>
        {loadingList && wishes.length === 0 ? <p className={styles.wishListState}>Memuat ucapan…</p> : null}
        {!loadingList && listResult && !listResult.ok ? <div className={styles.wishListState} role="alert"><p>{listResult.message}</p><button className={styles.secondaryAction} type="button" onClick={() => void load()}>Coba lagi</button></div> : null}
        {!preview && !loadingList && listResult?.ok && wishes.length === 0 ? <p className={styles.wishListState}>Belum ada ucapan yang disetujui. Jadilah yang pertama mengirim doa terbaik.</p> : null}
        {wishes.map((wish) => <article className={styles.wishCard} key={wish.id}>
          <p>“{wish.message}”</p>
          <footer><strong>{wish.guestName}</strong><time dateTime={wish.createdAt}>{dateFormatter.format(new Date(wish.createdAt))}</time></footer>
        </article>)}
        {cursor ? <button className={styles.secondaryAction} type="button" disabled={loadingList} onClick={() => void load(cursor)}>{loadingList ? "Memuat…" : "Muat ucapan lainnya"}</button> : null}
      </div>
    </Reveal>
  </section>;
}
