"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useDemo } from "@/components/DemoProvider";
import { templateId, themeId } from "@/domain";

export default function NewInvitationPage() {
  const { runtime, session } = useDemo(); const router = useRouter();
  const templates = runtime?.templates.list().filter((item) => item.status === "active") ?? [];
  const ownedRoutes = runtime && session ? runtime.routeService.listOwned(session) : [];
  const availableRoutes = ownedRoutes.filter((item) => !item.invitationId);
  const usage = runtime && session ? runtime.routeService.usage(session) : { used: 0, quota: 0, remaining: 0 };
  const [title, setTitle] = useState("Undangan Baru"); const [slug, setSlug] = useState("");
  const [routeMode, setRouteMode] = useState<"existing" | "new">("existing"); const [routeId, setRouteId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("minimal-white@1");
  const compatibleThemes = runtime ? runtime.themes.listForTemplate(...parseVersionedId(selectedTemplate)).filter((item) => item.status === "active") : [];
  const [selectedTheme, setSelectedTheme] = useState("minimal-white-default@1"); const [error, setError] = useState("");

  const effectiveRouteMode = routeMode === "existing" && availableRoutes.length === 0 && usage.remaining > 0 ? "new" : routeMode;
  const effectiveRouteId = routeId || availableRoutes[0]?.route.id || "";

  const changeTemplate = (value: string) => {
    setSelectedTemplate(value);
    if (!runtime) return;
    const [key, version] = parseVersionedId(value);
    const defaultTheme = runtime.themes.findDefault(key, version);
    if (defaultTheme) setSelectedTheme(themeId(defaultTheme));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError("");
    try {
      if (!runtime || !session) throw new Error("Session belum siap.");
      const [templateKey, templateVersion] = parseVersionedId(selectedTemplate);
      const [themeKey, themeVersion] = parseVersionedId(selectedTheme);
      const route = effectiveRouteMode === "existing" ? { mode: "existing" as const, routeId: effectiveRouteId } : { mode: "new" as const, slug };
      const invitation = runtime.invitationService.create(session, { title, route, templateKey, templateVersion, themeKey, themeVersion });
      router.push(`/dashboard/invitations/${invitation.id}/edit`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Undangan gagal dibuat."); }
  };
  const blocked = availableRoutes.length === 0 && usage.remaining === 0;

  return <AppShell title="Buat undangan">
    <div className="quota-grid"><article className="metric"><strong>{usage.used} / {usage.quota}</strong><span>Kuota Route</span></article><article className="metric"><strong>{usage.remaining}</strong><span>Kapasitas tersisa</span></article></div>
    {blocked ? <p className="form-error" role="alert">Kuota route penuh dan tidak ada route preassigned yang kosong. Hubungi admin untuk tambahan akses route.</p> : null}
    <section className="panel"><form className="form" onSubmit={submit}>
      <label className="field"><span>Judul</span><input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <fieldset className="choice-group"><legend>Route Publik</legend>
        <label className="choice"><input type="radio" name="routeMode" checked={effectiveRouteMode === "existing"} onChange={() => setRouteMode("existing")} disabled={availableRoutes.length === 0} /><span><strong>Gunakan route dari admin</strong><small>Pilih route kosong yang sudah dialokasikan dan tidak dapat Anda ubah.</small></span></label>
        {effectiveRouteMode === "existing" ? <label className="field"><span>Route tersedia</span><select value={effectiveRouteId} onChange={(event) => setRouteId(event.target.value)} required>{availableRoutes.map(({ route }) => <option key={route.id} value={route.id}>/{route.slug}</option>)}</select></label> : null}
        <label className="choice"><input type="radio" name="routeMode" checked={effectiveRouteMode === "new"} onChange={() => setRouteMode("new")} disabled={usage.remaining === 0} /><span><strong>Klaim route baru</strong><small>Menggunakan satu kapasitas kuota yang tersisa.</small></span></label>
        {effectiveRouteMode === "new" ? <label className="field"><span>Slug route baru</span><input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="nama-satu-dan-nama-dua" required /><small>Sistem akan menormalisasi dan mengunci slug setelah dibuat.</small></label> : null}
      </fieldset>
      <label className="field"><span>Template</span><select value={selectedTemplate} onChange={(event) => changeTemplate(event.target.value)}>{templates.map((template) => <option key={templateId(template)} value={templateId(template)}>{template.name}</option>)}</select></label>
      <label className="field"><span>Tema</span><select value={selectedTheme} onChange={(event) => setSelectedTheme(event.target.value)}>{compatibleThemes.map((theme) => <option key={themeId(theme)} value={themeId(theme)}>{theme.name} — {theme.description}</option>)}</select></label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button" type="submit" disabled={blocked}>Buat dan lanjut edit</button>
    </form></section>
  </AppShell>;
}

function parseVersionedId(value: string): [string, number] {
  const [key, rawVersion] = value.split("@");
  return [key, Number(rawVersion)];
}
