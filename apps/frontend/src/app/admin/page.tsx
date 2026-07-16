"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DevResetButton } from "@/components/DevResetButton";

export default function AdminPage() {
  return <AppShell title="Dashboard admin"><div className="grid cards">
    <article className="card"><span className="badge">Admin</span><h2>Kelola user demo</h2><p>Tambah user, cari akun, dan ubah status aktif.</p><div className="actions"><Link className="button" href="/admin/users">Buka user</Link></div></article>
    <article className="card"><span className="badge">Owner scope</span><h2>Undangan saya</h2><p>Admin memakai fitur user untuk undangan miliknya sendiri.</p><div className="actions"><Link className="button" href="/dashboard/invitations">Kelola undangan</Link></div></article>
    <article className="card"><h2>Data development</h2><p>Reset hanya menghapus namespace mock Ngaturi dan menanam ulang fixture.</p><div className="actions"><DevResetButton /></div></article>
  </div></AppShell>;
}
