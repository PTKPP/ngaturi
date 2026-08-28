import type { GuestRsvpRecord, RsvpSummary } from "@/repositories/contracts";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

export function RsvpOwnerPanel({ summary, responses }: { summary: RsvpSummary; responses: GuestRsvpRecord[] }) {
  return <section className="panel form-section" aria-labelledby="owner-rsvp-title">
    <div className="event-heading"><div><h2 id="owner-rsvp-title">RSVP tamu</h2><p>Summary dan maksimal 100 respons terbaru. Data ini hanya tersedia bagi owner undangan.</p></div></div>
    <div className="quota-grid">
      <div className="metric"><strong>{summary.attending}</strong><span>Respons hadir</span></div>
      <div className="metric"><strong>{summary.notAttending}</strong><span>Respons tidak hadir</span></div>
      <div className="metric"><strong>{summary.attendingGuestCount}</strong><span>Total tamu hadir</span></div>
      <div className="metric"><strong>{summary.totalResponses}</strong><span>Total respons</span></div>
    </div>
    {responses.length ? <div className="rsvp-owner-list">{responses.map((response) => <article className="rsvp-owner-row" key={response.id}>
      <div><strong>{response.guestName}</strong><span className={response.attendanceStatus === "attending" ? "badge" : "badge inactive"}>{response.attendanceStatus === "attending" ? `Hadir · ${response.guestCount} tamu` : "Tidak hadir"}</span></div>
      {response.note ? <p>{response.note}</p> : null}
      <time dateTime={response.createdAt}>{dateFormatter.format(new Date(response.createdAt))} WIB</time>
    </article>)}</div> : <p className="empty">Belum ada RSVP tamu.</p>}
  </section>;
}
