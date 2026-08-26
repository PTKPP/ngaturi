import Link from "next/link";
import { requireProfile } from "@/application/auth";
import { createApplicationRepository } from "@/repositories/supabase";
import { TemplateRenderer } from "@/templates/renderer";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const profile = await requireProfile();
  const invitation = await (await createApplicationRepository()).findOwnedInvitation(profile.id, id);
  if (!invitation) return <main className="state-card"><h1>Preview tidak tersedia</h1><Link className="button" href="/dashboard/invitations">Kembali</Link></main>;
  return <><div className="topbar"><Link className="button ghost" href={`/dashboard/invitations/${id}/edit`}>Kembali ke editor</Link><span className="badge">{invitation.status}</span></div><div className="preview-frame"><TemplateRenderer invitation={invitation} preview /></div></>;
}
