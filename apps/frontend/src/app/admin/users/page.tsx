import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { createApplicationRepository } from "@/repositories/supabase";
import { createUserAction, setAccountStatusAction } from "@/app/actions/admin";

export default async function AdminUsersPage() {
  const users = await (await createApplicationRepository()).listProfiles();
  return <AppShell title="User">
    <section className="panel"><h2>Tambah user</h2><form className="form two-column" action={createUserAction}>
      <label className="field"><span>Nama</span><input name="name" minLength={2} required /></label>
      <label className="field"><span>Email</span><input name="email" type="email" required /></label>
      <label className="field"><span>Password sementara</span><input name="password" type="password" minLength={12} required /></label>
      <label className="field"><span>Role</span><select name="role"><option value="user">User</option><option value="admin">Admin</option></select></label>
      <label className="field"><span>Kuota route</span><input name="routeQuota" type="number" min="0" step="1" defaultValue="1" required /></label>
      <div className="actions full"><button className="button" type="submit">Tambah user</button></div>
    </form></section>
    <section className="grid cards form-section">{users.map((user) => <article className="card" key={user.id}>
      <span className={`badge ${user.status === "inactive" ? "inactive" : ""}`}>{user.status}</span><h2>{user.name}</h2><p>{user.email}</p><p>Role: {user.role}</p><p>Kuota route: {user.routeQuota}</p>
      <div className="actions"><Link className="button" href={`/admin/users/${user.id}/routes`}>Kelola route</Link><form action={setAccountStatusAction}><input type="hidden" name="ownerId" value={user.id} /><input type="hidden" name="status" value={user.status === "active" ? "inactive" : "active"} /><button className="button secondary" type="submit">{user.status === "active" ? "Nonaktifkan" : "Aktifkan"}</button></form></div>
    </article>)}</section>
  </AppShell>;
}
