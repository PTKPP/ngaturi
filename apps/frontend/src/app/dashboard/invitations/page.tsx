"use client";

import Link from "next/link";
import { useReducer, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDemo } from "@/components/DemoProvider";

export default function InvitationsPage() {
  const { runtime, session } = useDemo(); const [, forceRender] = useReducer((value: number) => value + 1, 0); const [error, setError] = useState("");
  const invitations = runtime && session ? runtime.invitationService.listOwned(session) : [];
  const changePublication = (id: string, publish: boolean) => { setError(""); try { if (!runtime || !session) return; if (publish) runtime.invitationService.publish(session, id); else runtime.invitationService.unpublish(session, id); forceRender(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Status gagal diubah."); } };
  return <AppShell title="Undangan saya"><div className="actions" style={{ marginBottom: "1rem" }}><Link className="button" href="/dashboard/invitations/new">Buat undangan</Link></div>{error ? <p className="form-error">{error}</p> : null}
    {invitations.length === 0 ? <div className="empty"><h2>Belum ada undangan</h2><p>Buat undangan pertama Anda.</p></div> : <div className="grid cards">{invitations.map((invitation) => <article className="card" key={invitation.id}><span className={`badge ${invitation.status === "inactive" ? "inactive" : ""}`}>{invitation.status}</span><h2>{invitation.title}</h2><p>/{invitation.slug}</p><p>{invitation.templateKey}@{invitation.templateVersion}</p><div className="actions"><Link className="button" href={`/dashboard/invitations/${invitation.id}/edit`}>Edit</Link><Link className="button secondary" href={`/dashboard/invitations/${invitation.id}/preview`}>Preview</Link>{invitation.status === "published" ? <button className="button ghost" onClick={() => changePublication(invitation.id, false)}>Unpublish</button> : <button className="button ghost" onClick={() => changePublication(invitation.id, true)}>Publish</button>}</div></article>)}</div>}
  </AppShell>;
}
