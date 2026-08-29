"use client";

import { useRef, useState, useTransition } from "react";
import { submitRsvpAction, type SubmitRsvpActionResult } from "@/app/actions/rsvp";
import type { RsvpAttendanceStatus } from "@/rsvp/schema";
import styles from "../styles.module.css";
import { Reveal } from "./Reveal";

export function RsvpSection({ invitationId, preview = false }: { invitationId: string; preview?: boolean }) {
  const [guestName, setGuestName] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState<RsvpAttendanceStatus>("attending");
  const [guestCount, setGuestCount] = useState(1);
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [result, setResult] = useState<SubmitRsvpActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const submissionId = useRef<string | null>(null);

  const changed = () => {
    if (result && !result.ok) submissionId.current = null;
    setResult(null);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (preview || pending || result?.ok) return;
    submissionId.current ??= crypto.randomUUID();
    const payload = {
      invitationId,
      clientSubmissionId: submissionId.current,
      guestName,
      attendanceStatus,
      guestCount: attendanceStatus === "attending" ? guestCount : 0,
      note,
      website,
    };
    startTransition(async () => setResult(await submitRsvpAction(payload)));
  };

  return <section className={`${styles.section} ${styles.interactionSection}`} id="wedding-default-rsvp" aria-labelledby="wedding-default-rsvp-title">
    <Reveal className={styles.interactionPanel}>
      <p className={styles.kicker}>Konfirmasi kehadiran</p>
      <h2 id="wedding-default-rsvp-title">RSVP</h2>
      <p>Mohon konfirmasi kehadiran Anda melalui formulir berikut.</p>
      {result?.ok ? <div className={styles.rsvpSuccess} role="status">
        <strong>Terima kasih, RSVP Anda sudah tercatat.</strong>
        <span>Kami menantikan kehadiran Anda.</span>
      </div> : <form className={styles.rsvpForm} onSubmit={submit} noValidate>
        <label className={styles.rsvpField}><span>Nama</span><input value={guestName} minLength={2} maxLength={100} autoComplete="name" required disabled={preview || pending} onChange={(event) => { changed(); setGuestName(event.target.value); }} /></label>
        <fieldset className={styles.rsvpChoices} disabled={preview || pending}>
          <legend>Status kehadiran</legend>
          <label><input type="radio" name="rsvp-status" value="attending" checked={attendanceStatus === "attending"} onChange={() => { changed(); setAttendanceStatus("attending"); setGuestCount((count) => Math.max(1, count)); }} /><span>Hadir</span></label>
          <label><input type="radio" name="rsvp-status" value="not_attending" checked={attendanceStatus === "not_attending"} onChange={() => { changed(); setAttendanceStatus("not_attending"); setGuestCount(0); }} /><span>Tidak hadir</span></label>
        </fieldset>
        {attendanceStatus === "attending" ? <label className={styles.rsvpField}><span>Jumlah tamu</span><select value={guestCount} disabled={preview || pending} onChange={(event) => { changed(); setGuestCount(Number(event.target.value)); }}>{Array.from({ length: 10 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} orang</option>)}</select></label> : null}
        <label className={styles.rsvpField}><span>Pesan atau catatan <small>(opsional)</small></span><textarea value={note} maxLength={500} rows={4} disabled={preview || pending} onChange={(event) => { changed(); setNote(event.target.value); }} /></label>
        <label className={styles.rsvpHoneypot} aria-hidden="true">Website<input value={website} tabIndex={-1} autoComplete="off" onChange={(event) => setWebsite(event.target.value)} /></label>
        {preview ? <p className={styles.rsvpNotice}>Submission dinonaktifkan pada preview owner.</p> : null}
        {result && !result.ok ? <p className={styles.rsvpError} role="alert">{result.message}</p> : null}
        <button className={styles.primaryAction} type="submit" disabled={preview || pending}>{pending ? "Mengirim…" : "Kirim RSVP"}</button>
      </form>}
    </Reveal>
  </section>;
}
