import Link from "next/link";
import type { ReactNode } from "react";
import { currentProfile } from "@/application/auth";
import { logoutAction } from "@/app/actions/auth";

export async function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const profile = await currentProfile();
  return (
    <div className="app-shell">
      <header className="topbar"><Link className="brand" href={profile?.role === "admin" ? "/admin" : "/dashboard"}>ngaturi.</Link><form action={logoutAction}><button className="button ghost compact" type="submit">Keluar</button></form></header>
      <main className="app-content"><div className="page-heading"><p className="eyebrow">Workspace</p><h1>{title}</h1></div>{children}</main>
      <nav className="bottom-nav" aria-label="Navigasi utama">
        <Link href={profile?.role === "admin" ? "/admin" : "/dashboard"}>Beranda</Link>
        <Link href="/dashboard/invitations">Undangan</Link>
        {profile?.role === "admin" ? <Link href="/admin/users">User</Link> : null}
      </nav>
    </div>
  );
}
