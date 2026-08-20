"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useReducer, useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { useDemo } from "@/components/DemoProvider";
import type { InvitationRoute } from "@/domain";

export default function AdminUserRoutesPage() {
  const { id } = useParams<{ id: string }>();
  const { runtime, session } = useDemo();
  const [, forceRender] = useReducer((value: number) => value + 1, 0);
  const user = runtime?.users.findById(id) ?? null;
  const usage = runtime && session && user ? runtime.routeService.usageForUser(session, id) : null;
  const routes = runtime && session && user ? runtime.routeService.listForUser(session, id) : [];
  const [quota, setQuota] = useState<number | null>(null);
  const [slug, setSlug] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  if (!user || !usage) return <AppShell title="Kelola route"><div className="state-card"><h2>User tidak ditemukan</h2><Link className="button" href="/admin/users">Kembali</Link></div></AppShell>;
  const currentQuota = quota ?? user.routeQuota;
  const updateQuota = (event: FormEvent) => {
    event.preventDefault(); setError(""); setMessage("");
    try { if (!runtime || !session) return; runtime.userService.setRouteQuota(session, id, currentQuota); setQuota(currentQuota); setMessage("Kuota route diperbarui."); forceRender(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Kuota gagal diperbarui."); }
  };
  const preassign = (event: FormEvent) => {
    event.preventDefault(); setError(""); setMessage("");
    try { if (!runtime || !session) return; runtime.routeService.preassign(session, id, slug); setSlug(""); setMessage("Route berhasil dialokasikan."); forceRender(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Route gagal dialokasikan."); }
  };
  return <AppShell title={`Route ${user.name}`}>
    <p><Link className="text-link" href="/admin/users">← Kembali ke daftar user</Link></p>
    <div className="quota-grid"><article className="metric"><strong>{usage.used} / {usage.quota}</strong><span>Route teralokasi</span></article><article className="metric"><strong>{usage.remaining}</strong><span>Kapasitas tersisa</span></article></div>
    <section className="panel form-section"><h2>Kuota Route</h2><form className="form" onSubmit={updateQuota}><label className="field"><span>Kuota maksimum</span><input type="number" min={usage.used} step="1" value={currentQuota} onChange={(event) => setQuota(Number(event.target.value))} required /></label><button className="button" type="submit">Simpan kuota</button></form></section>
    <section className="panel form-section"><h2>Preassign Route Publik</h2><p>Route kosong tetap dihitung dalam kuota dan dapat dipilih user saat membuat undangan.</p><form className="form" onSubmit={preassign}><label className="field"><span>Slug baru</span><input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="nama-satu-dan-nama-dua" required /></label><button className="button" type="submit" disabled={usage.remaining === 0}>Alokasikan route</button></form></section>
    {message ? <p className="form-success">{message}</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}
    <section className="stack form-section" aria-label="Route teralokasi"><h2>Route milik user</h2>{routes.length === 0 ? <div className="empty"><p>Belum ada route teralokasi.</p></div> : routes.map(({ route, invitationId }) => <RouteCard key={route.id} route={route} invitationId={invitationId} onReassign={(nextSlug) => {
      if (!runtime || !session) return;
      if (!window.confirm(`Ganti /${route.slug} menjadi /${nextSlug}? Slug lama langsung tidak tersedia dan tidak dibuat redirect.`)) return;
      setError(""); setMessage("");
      try { runtime.routeService.reassign(session, route.id, nextSlug); setMessage("Route berhasil diganti. Konten, template, tema, dan status undangan tetap."); forceRender(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Route gagal diganti."); }
    }} />)}</section>
  </AppShell>;
}

function RouteCard({ route, invitationId, onReassign }: { route: InvitationRoute; invitationId: string | null; onReassign(slug: string): void }) {
  const [nextSlug, setNextSlug] = useState(route.slug);
  return <article className="card"><span className="badge">{invitationId ? "Sudah digunakan" : "Belum digunakan"}</span><h3>/{route.slug}</h3><p>Sumber: {route.assignedBy}</p><form className="form" onSubmit={(event) => { event.preventDefault(); onReassign(nextSlug); }}><label className="field"><span>Slug pengganti</span><input value={nextSlug} onChange={(event) => setNextSlug(event.target.value)} required /></label><button className="button danger" type="submit" disabled={nextSlug.trim() === route.slug}>Reassign route</button></form></article>;
}
