"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useDemo } from "@/components/DemoProvider";
import { templateId } from "@/domain";

export default function NewInvitationPage() {
  const { runtime, session } = useDemo(); const router = useRouter();
  const templates = runtime?.templates.list().filter((item) => item.status === "active") ?? [];
  const [title, setTitle] = useState("Undangan Baru"); const [slug, setSlug] = useState(""); const [selected, setSelected] = useState("minimal-white@1"); const [error, setError] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); setError(""); try { if (!runtime || !session) throw new Error("Session belum siap."); const [templateKey, rawVersion] = selected.split("@"); const invitation = runtime.invitationService.create(session, { title, slug, templateKey, templateVersion: Number(rawVersion) }); router.push(`/dashboard/invitations/${invitation.id}/edit`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Undangan gagal dibuat."); } };
  return <AppShell title="Buat undangan"><section className="panel"><form className="form" onSubmit={submit}><label className="field"><span>Judul</span><input value={title} onChange={(event) => setTitle(event.target.value)} required /></label><label className="field"><span>Slug publik</span><input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="nama-satu-dan-nama-dua" required /><small>Huruf kecil, angka, dan dash. Sistem akan merapikan input.</small></label><label className="field"><span>Template</span><select value={selected} onChange={(event) => setSelected(event.target.value)}>{templates.map((template) => <option key={templateId(template)} value={templateId(template)}>{template.name}</option>)}</select></label>{error ? <p className="form-error">{error}</p> : null}<button className="button" type="submit">Buat dan lanjut edit</button></form></section></AppShell>;
}
