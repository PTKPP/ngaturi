"use client";

import { useParams } from "next/navigation";
import { useDemo } from "@/components/DemoProvider";
import { TemplateRenderer } from "@/templates/renderer";

export default function PublicInvitationPage() {
  const { slug } = useParams<{ slug: string }>(); const { runtime, ready, error } = useDemo();
  if (!ready) return <main className="state-card"><p>Menyiapkan undangan demo…</p></main>;
  if (error) return <main className="state-card"><h1>Data demo belum tersedia</h1><p>{error}</p></main>;
  const invitation = runtime?.invitationService.findPublished(slug) ?? null;
  if (!invitation) return <main className="state-card"><h1>Undangan tidak ditemukan</h1><p>Slug ini tidak ada atau undangannya belum dipublikasikan.</p><small>Prototype publik hanya tersedia pada browser yang sama dengan data localStorage.</small></main>;
  return <TemplateRenderer invitation={invitation} />;
}
