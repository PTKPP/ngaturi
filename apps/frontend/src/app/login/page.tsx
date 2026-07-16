"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/components/DemoProvider";

export default function LoginPage() {
  const { runtime, ready, error: runtimeError, refreshSession } = useDemo();
  const router = useRouter();
  const [email, setEmail] = useState("user@demo.local");
  const [password, setPassword] = useState("user-demo");
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError("");
    try {
      if (!runtime) throw new Error("Data demo belum siap.");
      const session = runtime.auth.login(email, password);
      refreshSession(); router.replace(session.role === "admin" ? "/admin" : "/dashboard");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Login gagal."); }
  };
  return (
    <main className="login-page"><section className="login-card">
      <p className="eyebrow">Frontend-only prototype</p><h1>Masuk ke Ngaturi</h1><p>Kelola undangan demo langsung di browser ini.</p>
      {runtimeError ? <p className="form-error">{runtimeError}</p> : null}
      <form className="form" onSubmit={submit}>
        <label className="field"><span>Email demo</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
        <label className="field"><span>Password demo</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="button" type="submit" disabled={!ready || !runtime}>Masuk</button>
      </form>
      <div className="hint"><strong>User:</strong> user@demo.local / user-demo<br /><strong>Admin:</strong> admin@demo.local / admin-demo<br />Credential ini hanya untuk development prototype, bukan model keamanan production.</div>
    </section></main>
  );
}
