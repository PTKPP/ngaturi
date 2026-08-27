"use client";

import type { InvitationTemplate } from "@/domain";
import { WeddingModuleEditor } from "./wedding-editor";
import { moduleRegistry } from "./registry";
import { toWeddingRenderModel, updateFromWeddingRenderModel, type InvitationModuleContent } from "./content";
import { InvitationMusicSchema } from "@/invitation-music/registry";

function ModuleConfigurationEditors({ template, value, onChange }: { template: InvitationTemplate; value: InvitationModuleContent; onChange(value: InvitationModuleContent): void }) {
  const updateModule = (id: string, next: unknown) => onChange({ ...value, modules: { ...value.modules, [id]: next } });
  const cover = moduleRegistry.cover.schema.parse(value.modules.cover);
  const countdown = template.supportedModules.includes("countdown") ? moduleRegistry.countdown.schema.parse(value.modules.countdown) : null;
  const video = template.supportedModules.includes("video") ? moduleRegistry.video.schema.parse(value.modules.video) : null;
  const maps = template.supportedModules.includes("maps") ? moduleRegistry.maps.schema.parse(value.modules.maps) : null;
  const music = template.supportedModules.includes("music") ? InvitationMusicSchema.parse(value.modules.music) : null;
  return <>
    <section className="form-section form">
      <h2>Sampul</h2>
      <div className="form two-column">
        <label className="field"><span>Label sampul</span><input value={cover.eyebrow} onChange={(event) => updateModule("cover", { ...cover, eyebrow: event.target.value })} /></label>
        <label className="field"><span>Judul sampul</span><input value={cover.title} onChange={(event) => updateModule("cover", { ...cover, title: event.target.value })} /></label>
      </div>
    </section>
    {countdown ? <section className="form-section form"><h2>Hitung mundur</h2><label className="field"><span>Label hitung mundur</span><input value={countdown.label} onChange={(event) => updateModule("countdown", { label: event.target.value })} /></label></section> : null}
    {video ? <section className="form-section form"><h2>Video</h2><label className="field"><span>URL YouTube atau Vimeo</span><input type="url" value={video.url} onChange={(event) => updateModule("video", { url: event.target.value })} placeholder="https://www.youtube.com/watch?v=..." /></label></section> : null}
    {maps ? <section className="form-section form"><h2>Peta</h2><label className="field"><span>Label tombol peta</span><input value={maps.label} onChange={(event) => updateModule("maps", { label: event.target.value })} /></label></section> : null}
    {music ? <section className="form-section form" data-music-editor>
      <div><h2>Musik undangan</h2><p>Musik terpisah dari tema dan hanya mulai setelah tamu membuka undangan.</p></div>
      <div className="form two-column">
        <label className="field"><span>Track</span><select value={music.trackId} onChange={(event) => updateModule("music", { ...music, trackId: event.target.value })}><option value="none">Tanpa musik</option><option value="ambient-soft">Ambient lembut</option></select></label>
        <label className="field"><span>Judul track</span><input value={music.title} maxLength={80} onChange={(event) => updateModule("music", { ...music, title: event.target.value })} /></label>
        <label className="field"><span>Mulai pada detik</span><input type="number" min="0" max="300" value={music.startAtSeconds} onChange={(event) => updateModule("music", { ...music, startAtSeconds: Number(event.target.value) })} /></label>
        <label className="field"><span>Volume awal (0–100%)</span><input type="number" min="0" max="100" value={Math.round(music.volume * 100)} onChange={(event) => updateModule("music", { ...music, volume: Number(event.target.value) / 100 })} /></label>
      </div>
      <label className="check-field"><input type="checkbox" checked={music.loop} onChange={(event) => updateModule("music", { ...music, loop: event.target.checked })} /><span>Ulangi musik</span></label>
    </section> : null}
  </>;
}

export function InvitationModuleEditor({ template, value, onChange }: { template: InvitationTemplate; value: InvitationModuleContent; onChange(value: InvitationModuleContent): void }) {
  const required = new Set(template.requiredModules);
  const toggleable = template.supportedModules.filter((id) => !required.has(id));
  return <div className="form" data-template-editor data-module-editor>
    <section className="form-section">
      <h2>Modul undangan</h2>
      <p>Modul wajib selalu aktif. Modul opsional dapat disimpan tanpa harus ditampilkan oleh template.</p>
      <div className="form two-column">{toggleable.map((id) => <label className="check-field" key={id}>
        <input type="checkbox" checked={value.moduleState[id]?.enabled ?? false} onChange={(event) => onChange({ ...value, moduleState: { ...value.moduleState, [id]: { enabled: event.target.checked } } })} />
        <span>{moduleRegistry[id].name}</span>
      </label>)}</div>
    </section>
    <WeddingModuleEditor value={toWeddingRenderModel(value, false)} onChange={(next) => onChange(updateFromWeddingRenderModel(value, next))} />
    <ModuleConfigurationEditors template={template} value={value} onChange={onChange} />
  </div>;
}
