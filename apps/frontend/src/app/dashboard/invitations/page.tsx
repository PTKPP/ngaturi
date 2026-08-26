import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireProfile } from "@/application/auth";
import { createApplicationRepository } from "@/repositories/supabase";
import { setInvitationStatusAction } from "@/app/actions/invitations";

export default async function InvitationsPage() {
  const profile = await requireProfile(); const repository = await createApplicationRepository();
  const [invitations, routes, usage] = await Promise.all([repository.listOwnedInvitations(profile.id), repository.listOwnedRoutes(profile.id), repository.routeUsage(profile)]);
  const routeById = new Map(routes.map(({ route }) => [route.id, route]));
  return <AppShell title="Undangan saya">
    <div className="quota-grid"><article className="metric"><strong>{usage.used} / {usage.quota}</strong><span>Kuota Route</span></article><article className="metric"><strong>{usage.remaining}</strong><span>Tersisa</span></article></div>
    <div className="actions" style={{ marginBottom: "1rem" }}><Link className="button" href="/dashboard/invitations/new">Buat undangan</Link></div>
    {invitations.length === 0 ? <div className="empty"><h2>Belum ada undangan</h2><p>Buat undangan pertama Anda.</p></div> : <div className="grid cards">{invitations.map((invitation) => <article className="card" key={invitation.id}><span className={`badge ${invitation.status === "inactive" ? "inactive" : ""}`}>{invitation.status}</span><h2>{invitation.title}</h2><p>/{routeById.get(invitation.routeId)?.slug ?? "route-tidak-tersedia"}</p><p>Template: {invitation.templateKey}@{invitation.templateVersion}</p><p>Tema: {invitation.themeKey}@{invitation.themeVersion}</p><div className="actions"><Link className="button" href={`/dashboard/invitations/${invitation.id}/edit`}>Edit</Link><Link className="button secondary" href={`/dashboard/invitations/${invitation.id}/preview`}>Preview</Link><form action={setInvitationStatusAction}><input type="hidden" name="id" value={invitation.id} /><input type="hidden" name="status" value={invitation.status === "published" ? "inactive" : "published"} /><button className="button ghost" type="submit">{invitation.status === "published" ? "Unpublish" : "Publish"}</button></form></div></article>)}</div>}
  </AppShell>;
}
