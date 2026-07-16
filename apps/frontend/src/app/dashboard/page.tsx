"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DevResetButton } from "@/components/DevResetButton";

export default function DashboardPage() {
  return <AppShell title="Dashboard"><div className="grid cards">
    <article className="card"><span className="badge">Mulai di sini</span><h2>Undangan saya</h2><p>Buat, edit, preview, dan publish undangan dari satu alur.</p><div className="actions"><Link className="button" href="/dashboard/invitations">Lihat undangan</Link><Link className="button secondary" href="/dashboard/invitations/new">Buat baru</Link></div></article>
    <article className="card"><h2>Prototype satu browser</h2><p>Perubahan disimpan di localStorage dan tidak tersedia lintas perangkat.</p></article>
    <article className="card"><h2>Data development</h2><p>Kembalikan akun, template, dan undangan ke fixture awal.</p><div className="actions"><DevResetButton /></div></article>
  </div></AppShell>;
}
