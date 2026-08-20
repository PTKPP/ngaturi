"use client";

import Link from "next/link";
import { useReducer, useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { useDemo } from "@/components/DemoProvider";
import type { UserRole } from "@/domain";

export default function AdminUsersPage() {
  const { runtime, session } = useDemo();
  const [, forceRender] = useReducer((value: number) => value + 1, 0);
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("all");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState<UserRole>("user");
  const [routeQuota, setRouteQuota] = useState(1);
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const users = runtime?.userService.list(query, status) ?? [];

  const submit = (event: FormEvent) => {
    event.preventDefault(); setError(""); setMessage("");
    try {
      if (!runtime || !session) throw new Error("Session admin belum siap.");
      runtime.userService.create(session, { name, email, role, routeQuota });
      setName(""); setEmail(""); setRouteQuota(1); setMessage("User demo berhasil dibuat."); forceRender();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "User gagal dibuat."); }
  };
  const toggle = (id: string) => {
    setError(""); setMessage("");
    try { if (!runtime || !session) return; runtime.userService.toggleStatus(session, id); forceRender(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Status gagal diubah."); }
  };

  return <AppShell title="User demo">
    <section className="panel"><h2>Tambah user</h2><p>Nilai kuota adalah data dummy prototype. Credential login user baru belum dibuat otomatis.</p>
      <form className="form two-column" onSubmit={submit}>
        <label className="field"><span>Nama</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={2} required /></label>
        <label className="field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field"><span>Role</span><select value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="user">User</option><option value="admin">Admin</option></select></label>
        <label className="field"><span>Kuota Route awal</span><input type="number" min="0" step="1" value={routeQuota} onChange={(event) => setRouteQuota(Number(event.target.value))} required /></label>
        <div className="actions full"><button className="button" type="submit">Tambah user</button></div>
      </form>
      {message ? <p className="form-success">{message}</p> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
    <section style={{ marginTop: "1rem" }}>
      <div className="filters"><label className="field"><span>Cari nama atau email</span><input value={query} onChange={(event) => setQuery(event.target.value)} type="search" /></label><label className="field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Semua</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label></div>
      <div className="grid cards">{users.map((user) => {
        const usage = runtime && session ? runtime.routeService.usageForUser(session, user.id) : { used: 0, quota: user.routeQuota, remaining: user.routeQuota };
        return <article className="card" key={user.id}>
          <span className={`badge ${user.status === "inactive" ? "inactive" : ""}`}>{user.status}</span>
          <h2>{user.name}</h2><p>{user.email}</p><p>Role: {user.role}</p><p><strong>Route: {usage.used} / {usage.quota}</strong> · tersisa {usage.remaining}</p>
          <div className="actions"><Link className="button" href={`/admin/users/${user.id}/routes`}>Kelola route</Link><button className="button secondary" onClick={() => toggle(user.id)}>{user.status === "active" ? "Nonaktifkan" : "Aktifkan"}</button></div>
        </article>;
      })}</div>
    </section>
  </AppShell>;
}
