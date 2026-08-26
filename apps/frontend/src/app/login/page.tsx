import { loginAction } from "@/app/actions/auth";
import { getSupabaseEnvironment } from "@/config/supabase";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = getSupabaseEnvironment() !== null;
  return (
    <main className="login-page"><section className="login-card">
      <p className="eyebrow">Supabase Auth</p><h1>Masuk ke Ngaturi</h1><p>Gunakan akun yang dikelola administrator.</p>
      {!configured ? <p className="form-error" role="alert">Supabase belum dikonfigurasi. Salin nama variabel dari <code>.env.example</code> ke <code>apps/frontend/.env.local</code>.</p> : null}
      <form className="form" action={loginAction}>
        <label className="field"><span>Email</span><input name="email" type="email" autoComplete="username" required /></label>
        <label className="field"><span>Password</span><input name="password" type="password" autoComplete="current-password" required /></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="button" type="submit" disabled={!configured}>Masuk</button>
      </form>
    </section></main>
  );
}
