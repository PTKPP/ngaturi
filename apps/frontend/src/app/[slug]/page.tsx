import { TemplateRenderer } from "@/templates/renderer";
import { createApplicationRepository } from "@/repositories/supabase";
import { getSupabaseEnvironment } from "@/config/supabase";

export const dynamic = "force-dynamic";

export default async function PublicInvitationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getSupabaseEnvironment()) return <main className="state-card"><h1>Layanan belum dikonfigurasi</h1><p>Supabase belum tersedia pada environment ini.</p></main>;
  const invitation = await (await createApplicationRepository()).findPublishedInvitation(slug);
  if (!invitation) return <main className="state-card"><h1>Undangan tidak ditemukan</h1><p>Slug ini tidak ada atau undangannya belum dipublikasikan.</p></main>;
  return <TemplateRenderer invitation={invitation} />;
}
