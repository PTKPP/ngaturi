"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useDemo } from "./DemoProvider";

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { runtime, session, refreshSession } = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const logout = () => { runtime?.auth.logout(); refreshSession(); router.replace("/login"); };
  return (
    <div className="app-shell">
      <header className="topbar"><Link className="brand" href={session?.role === "admin" ? "/admin" : "/dashboard"}>ngaturi.</Link><button className="button ghost compact" onClick={logout}>Keluar</button></header>
      <main className="app-content"><div className="page-heading"><p className="eyebrow">Prototype lokal</p><h1>{title}</h1></div>{children}</main>
      <nav className="bottom-nav" aria-label="Navigasi utama">
        <Link className={pathname === "/dashboard" || pathname === "/admin" ? "active" : ""} href={session?.role === "admin" ? "/admin" : "/dashboard"}>Beranda</Link>
        <Link className={pathname.startsWith("/dashboard/invitations") ? "active" : ""} href="/dashboard/invitations">Undangan</Link>
        {session?.role === "admin" ? <Link className={pathname.startsWith("/admin/users") ? "active" : ""} href="/admin/users">User</Link> : null}
      </nav>
    </div>
  );
}
