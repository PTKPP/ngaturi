"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useDemo } from "@/components/DemoProvider";
import type { Invitation, Session } from "@/domain";
import type { DemoRuntime } from "@/lib/demo-runtime";
import { TemplateRenderer } from "@/templates/renderer";

function loadInvitation(runtime: DemoRuntime, session: Session, id: string): { invitation: Invitation | null; error: string } {
  try { return { invitation: runtime.invitationService.getOwned(session, id), error: "" }; }
  catch (cause) { return { invitation: null, error: cause instanceof Error ? cause.message : "Undangan tidak dapat dibuka." }; }
}

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>(); const { runtime, session } = useDemo();
  if (!runtime || !session) return <main className="state-card"><p>Memuat preview…</p></main>;
  const { invitation, error } = loadInvitation(runtime, session, id);
  if (!invitation) return <main className="state-card"><h1>Preview tidak tersedia</h1><p>{error}</p><Link className="button" href="/dashboard/invitations">Kembali</Link></main>;
  return <><div className="topbar"><Link className="button ghost" href={`/dashboard/invitations/${id}/edit`}>Kembali ke editor</Link><span className="badge">{invitation.status}</span></div><div className="preview-frame"><TemplateRenderer invitation={invitation} preview /></div></>;
}
