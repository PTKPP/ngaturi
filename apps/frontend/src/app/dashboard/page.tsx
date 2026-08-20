"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useDemo } from "@/components/DemoProvider";
import { DevResetButton } from "@/components/DevResetButton";

export default function DashboardPage() {
  const { runtime, session } = useDemo();
  const usage = runtime && session ? runtime.routeService.usage(session) : { used: 0, quota: 0, remaining: 0 };
  const routes = runtime && session ? runtime.routeService.listOwned(session) : [];
  return <AppShell title="Dashboard">
    <div className="quota-grid"><article className="metric"><strong>{usage.used} / {usage.quota}</strong><span>Kuota Route terpakai</span></article><article className="metric"><strong>{usage.remaining}</strong><span>Kapasitas tersisa</span></article></div>
    {usage.remaining === 0 ? <p className="notice">Kuota route penuh. Route kosong yang sudah dialokasikan masih dapat dipakai; hubungi admin bila memerlukan route tambahan.</p> : null}
    <section className="panel form-section"><h2>Route Publik saya</h2>{routes.length === 0 ? <p>Belum ada route teralokasi.</p> : <div className="route-list">{routes.map(({ route, invitationId }) => <div className="route-row" key={route.id}><span>/{route.slug}</span><span className="badge">{invitationId ? "Ada undangan" : "Tersedia"}</span></div>)}</div>}</section>
    <div className="grid cards">
      <article className="card"><span className="badge">Mulai di sini</span><h2>Undangan saya</h2><p>Buat, edit, preview, dan publish undangan dari satu alur.</p><div className="actions"><Link className="button" href="/dashboard/invitations">Lihat undangan</Link><Link className="button secondary" href="/dashboard/invitations/new">Buat baru</Link></div></article>
      <article className="card"><h2>Prototype satu browser</h2><p>Perubahan disimpan di localStorage dan tidak tersedia lintas perangkat.</p></article>
      <article className="card"><h2>Data development</h2><p>Kembalikan akun, template, tema, route, dan undangan ke fixture awal.</p><div className="actions"><DevResetButton /></div></article>
    </div>
  </AppShell>;
}
