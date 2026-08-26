import { AppShell } from "@/components/AppShell";
import { InvitationDesignSelector } from "@/components/InvitationDesignSelector";
import { categoryRegistry } from "@/domain";
import { requireProfile } from "@/application/auth";
import { createApplicationRepository } from "@/repositories/supabase";
import { createInvitationAction } from "@/app/actions/invitations";

export default async function NewInvitationPage() {
  const profile = await requireProfile(); const repository = await createApplicationRepository();
  const [templates, themes, ownedRoutes, usage] = await Promise.all([repository.listTemplates(), repository.listThemes(), repository.listOwnedRoutes(profile.id), repository.routeUsage(profile)]);
  const availableRoutes = ownedRoutes.filter((item) => !item.invitationId);
  const blocked = availableRoutes.length === 0 && usage.remaining === 0;

  return <AppShell title="Buat undangan">
    <div className="quota-grid"><article className="metric"><strong>{usage.used} / {usage.quota}</strong><span>Kuota Route</span></article><article className="metric"><strong>{usage.remaining}</strong><span>Kapasitas tersisa</span></article></div>
    {blocked ? <p className="form-error" role="alert">Kuota route penuh dan tidak ada route preassigned yang kosong. Hubungi admin untuk tambahan akses route.</p> : null}
    <section className="panel"><form className="form" action={createInvitationAction}>
      <label className="field"><span>Judul</span><input name="title" defaultValue="Undangan Baru" required /></label>
      <fieldset className="choice-group"><legend>Route Publik</legend>
        <label className="choice"><input type="radio" name="routeMode" value="existing" defaultChecked={availableRoutes.length > 0} disabled={availableRoutes.length === 0} /><span><strong>Gunakan route dari admin</strong><small>Pilih route kosong yang sudah dialokasikan.</small></span></label>
        <label className="field"><span>Route tersedia</span><select name="routeId" defaultValue={availableRoutes[0]?.route.id}>{availableRoutes.map(({ route }) => <option key={route.id} value={route.id}>/{route.slug}</option>)}</select></label>
        <label className="choice"><input type="radio" name="routeMode" value="new" defaultChecked={availableRoutes.length === 0} disabled={usage.remaining === 0} /><span><strong>Klaim route baru</strong><small>Menggunakan satu kapasitas kuota yang tersisa.</small></span></label>
        <label className="field"><span>Slug route baru</span><input name="slug" placeholder="nama-satu-dan-nama-dua" /><small>Slug dinormalisasi dan dikunci setelah dibuat.</small></label>
      </fieldset>
      <InvitationDesignSelector categories={categoryRegistry.map(({ key, version, name }) => ({ key, version, name }))} templates={templates} themes={themes} />
      <button className="button" type="submit" disabled={blocked}>Buat dan lanjut edit</button>
    </form></section>
  </AppShell>;
}
