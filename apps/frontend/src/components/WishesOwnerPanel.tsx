"use client";

import { useState, useTransition } from "react";
import {
  listOwnedWishesAction,
  moderateWishAction,
  type OwnedWishListActionResult,
} from "@/app/actions/wishes";
import type { OwnedWishRecord, WishSummary } from "@/repositories/contracts";
import type { WishModerationStatus, WishStatus } from "@/wishes/schema";

const PAGE_SIZE = 50;
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const labels: Record<WishStatus, string> = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak" };

export function WishesOwnerPanel({
  invitationId,
  initialSummary,
  initialWishes,
}: {
  invitationId: string;
  initialSummary: WishSummary;
  initialWishes: OwnedWishRecord[];
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [wishes, setWishes] = useState(initialWishes);
  const [status, setStatus] = useState<WishStatus>("pending");
  const [offset, setOffset] = useState(0);
  const [feedback, setFeedback] = useState<OwnedWishListActionResult | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = (nextStatus: WishStatus, nextOffset = 0) => {
    startTransition(async () => {
      const result = await listOwnedWishesAction({ invitationId, status: nextStatus, offset: nextOffset });
      setFeedback(result);
      if (result.ok) {
        setSummary(result.summary);
        setWishes(result.wishes);
        setStatus(result.status);
        setOffset(result.offset);
      }
    });
  };

  const moderate = (wish: OwnedWishRecord, nextStatus: WishModerationStatus) => {
    if (pending || busyId) return;
    setBusyId(wish.id);
    startTransition(async () => {
      const result = await moderateWishAction({ invitationId, wishId: wish.id, status: nextStatus, expectedUpdatedAt: wish.updatedAt });
      if (!result.ok) {
        setFeedback(result);
        setBusyId(null);
        if (result.code === "WISH_MODERATION_CONFLICT") load(status, offset);
        return;
      }
      const refreshed = await listOwnedWishesAction({ invitationId, status, offset });
      setFeedback(refreshed);
      if (refreshed.ok) {
        setSummary(refreshed.summary);
        setWishes(refreshed.wishes);
      }
      setBusyId(null);
    });
  };

  return <section className="panel form-section" aria-labelledby="owner-wishes-title">
    <div className="event-heading"><div><h2 id="owner-wishes-title">Moderasi ucapan</h2><p>Submission baru selalu menunggu persetujuan dan tidak langsung tampil ke public.</p></div></div>
    <div className="quota-grid wishes-summary">
      <div className="metric"><strong>{summary.pending}</strong><span>Menunggu</span></div>
      <div className="metric"><strong>{summary.approved}</strong><span>Disetujui</span></div>
      <div className="metric"><strong>{summary.rejected}</strong><span>Ditolak</span></div>
      <div className="metric"><strong>{summary.total}</strong><span>Total ucapan</span></div>
    </div>
    <label className="field wishes-filter"><span>Filter status</span><select value={status} disabled={pending} onChange={(event) => load(event.target.value as WishStatus)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {feedback && !feedback.ok ? <p className="form-error" role="alert">{feedback.message}</p> : null}
    {pending && !busyId ? <p className="hint" role="status">Memuat daftar ucapan…</p> : null}
    {wishes.length ? <div className="wishes-owner-list">{wishes.map((wish) => <article className="wishes-owner-row" key={wish.id}>
      <div><strong>{wish.guestName}</strong><span className={`badge wish-${wish.status}`}>{labels[wish.status]}</span></div>
      <p>{wish.message}</p>
      <time dateTime={wish.createdAt}>{dateFormatter.format(new Date(wish.createdAt))} WIB</time>
      <div className="actions">
        {wish.status !== "approved" ? <button className="button compact" type="button" disabled={pending || Boolean(busyId)} onClick={() => moderate(wish, "approved")}>{busyId === wish.id ? "Menyimpan…" : "Setujui"}</button> : null}
        {wish.status !== "rejected" ? <button className="button compact danger" type="button" disabled={pending || Boolean(busyId)} onClick={() => moderate(wish, "rejected")}>{busyId === wish.id ? "Menyimpan…" : "Tolak"}</button> : null}
      </div>
    </article>)}</div> : !pending ? <p className="empty">Belum ada ucapan berstatus {labels[status].toLowerCase()}.</p> : null}
    <div className="actions wishes-pagination">
      <button className="button secondary compact" type="button" disabled={pending || offset === 0} onClick={() => load(status, Math.max(0, offset - PAGE_SIZE))}>Sebelumnya</button>
      <button className="button secondary compact" type="button" disabled={pending || wishes.length < PAGE_SIZE} onClick={() => load(status, offset + PAGE_SIZE)}>Berikutnya</button>
    </div>
  </section>;
}
