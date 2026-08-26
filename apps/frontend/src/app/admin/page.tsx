import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function AdminPage() {
  return <AppShell title="Dashboard admin"><div className="grid cards">
    <article className="card"><span className="badge">Admin</span><h2>Kelola user</h2><p>Tambah user, atur status akun, kuota, dan route.</p><div className="actions"><Link className="button" href="/admin/users">Buka user</Link></div></article>
    <article className="card"><span className="badge">Owner scope</span><h2>Undangan saya</h2><p>Admin memakai fitur user untuk undangan miliknya sendiri.</p><div className="actions"><Link className="button" href="/dashboard/invitations">Kelola undangan</Link></div></article>
  </div></AppShell>;
}
