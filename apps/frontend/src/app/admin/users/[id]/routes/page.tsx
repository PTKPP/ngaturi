import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createApplicationRepository } from "@/repositories/supabase";
import { preassignRouteAction, reassignRouteAction, setQuotaAction } from "@/app/actions/admin";

export default async function AdminUserRoutesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const repository = await createApplicationRepository();
  const user = (await repository.listProfiles()).find((item) => item.id === id);
  if (!user) return <AppShell title="Kelola route"><div className="state-card"><h2>User tidak ditemukan</h2></div></AppShell>;
  const [usage, routes] = await Promise.all([repository.routeUsage(user), repository.listOwnedRoutes(id)]);
  return <AppShell title={`Route ${user.name}`}>
    <p><Link className="text-link" href="/admin/users">← Kembali ke daftar user</Link></p>
    <div className="quota-grid"><article className="metric"><strong>{usage.used} / {usage.quota}</strong><span>Route teralokasi</span></article><article className="metric"><strong>{usage.remaining}</strong><span>Kapasitas tersisa</span></article></div>
    <section className="panel form-section"><h2>Kuota route</h2><form className="form" action={setQuotaAction}><input type="hidden" name="ownerId" value={id} /><label className="field"><span>Kuota maksimum</span><input name="quota" type="number" min={usage.used} defaultValue={usage.quota} required /></label><button className="button" type="submit">Simpan kuota</button></form></section>
    <section className="panel form-section"><h2>Preassign route</h2><form className="form" action={preassignRouteAction}><input type="hidden" name="ownerId" value={id} /><label className="field"><span>Slug</span><input name="slug" required /></label><button className="button" type="submit" disabled={usage.remaining === 0}>Alokasikan route</button></form></section>
    <section className="stack form-section"><h2>Route milik user</h2>{routes.map(({ route, invitationId }) => <article className="card" key={route.id}><span className="badge">{invitationId ? "Sudah digunakan" : "Belum digunakan"}</span><h3>/{route.slug}</h3><form className="form" action={reassignRouteAction}><input type="hidden" name="ownerId" value={id} /><input type="hidden" name="routeId" value={route.id} /><label className="field"><span>Slug pengganti</span><input name="slug" defaultValue={route.slug} required /></label><label className="choice"><input type="checkbox" name="confirm" required /><span><strong>Konfirmasi penggantian slug</strong><small>Konten, owner, template, tema, dan status tidak berubah.</small></span></label><button className="button danger" type="submit">Reassign route</button></form></article>)}</section>
  </AppShell>;
}
