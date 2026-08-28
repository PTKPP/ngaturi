"use client";

import type { InvitationTemplate } from "@/domain";
import { WeddingModuleEditor } from "./editors/WeddingContentEditor";
import { moduleRegistry } from "./registry";
import { toWeddingRenderModel, updateFromWeddingRenderModel, type InvitationModuleContent } from "./content";
import { InvitationMusicSchema } from "@/invitation-music/registry";
import type { InvitationAudioMedia, InvitationImageMedia, InvitationOwnedMedia } from "@/repositories/contracts";
import { DaztoreImageMediaEditor } from "@/invitation-media/DaztoreImageMediaEditor";
import { InvitationAudioMediaEditor } from "@/invitation-media/InvitationAudioMediaEditor";
import { GiftModuleEditor } from "./editors/GiftModuleEditor";
import { GiftModuleSchema } from "./definitions/gift";
import { MapsModuleEditor } from "./editors/MapsModuleEditor";
import { VideoModuleEditor } from "./editors/VideoModuleEditor";

function ModuleConfigurationEditors({ template, invitationId, media, value, onChange, onMediaChange, onScheduleMediaDeletion, onMediaBusyChange }: {
  template: InvitationTemplate;
  invitationId?: string;
  media: InvitationOwnedMedia[];
  value: InvitationModuleContent;
  onChange(value: InvitationModuleContent): void;
  onMediaChange(media: InvitationOwnedMedia): void;
  onScheduleMediaDeletion(mediaId: string): void;
  onMediaBusyChange(busy: boolean): void;
}) {
  const updateModule = (id: string, next: unknown) => onChange({ ...value, modules: { ...value.modules, [id]: next } });
  const cover = moduleRegistry.cover.schema.parse(value.modules.cover);
  const countdown = template.supportedModules.includes("countdown") ? moduleRegistry.countdown.schema.parse(value.modules.countdown) : null;
  const video = template.supportedModules.includes("video") ? moduleRegistry.video.schema.parse(value.modules.video) : null;
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
    {video ? <VideoModuleEditor value={video} onChange={(next) => updateModule("video", next)} /> : null}
    {music ? <section className="form-section form" data-music-editor>
      <div><h2>Musik undangan</h2><p>Musik terpisah dari tema dan hanya mulai setelah tamu membuka undangan.</p></div>
      <div className="form two-column">
        <label className="field"><span>Track</span><select value={music.trackId} onChange={(event) => {
          const trackId = event.target.value;
          updateModule("music", { ...music, trackId, mediaId: trackId === "custom" ? music.mediaId : "" });
        }}><option value="none">Tanpa musik</option><option value="ambient-soft">Ambient lembut</option>{music.trackId === "custom" ? <option value="custom">Custom audio</option> : null}</select></label>
        <label className="field"><span>Judul track</span><input value={music.title} maxLength={80} onChange={(event) => updateModule("music", { ...music, title: event.target.value })} /></label>
        <label className="field"><span>Mulai pada detik</span><input type="number" min="0" max="300" value={music.startAtSeconds} onChange={(event) => updateModule("music", { ...music, startAtSeconds: Number(event.target.value) })} /></label>
        <label className="field"><span>Volume awal (0–100%)</span><input type="number" min="0" max="100" value={Math.round(music.volume * 100)} onChange={(event) => updateModule("music", { ...music, volume: Number(event.target.value) / 100 })} /></label>
      </div>
      <label className="check-field"><input type="checkbox" checked={music.loop} onChange={(event) => updateModule("music", { ...music, loop: event.target.checked })} /><span>Ulangi musik</span></label>
      {invitationId ? <InvitationAudioMediaEditor
        invitationId={invitationId}
        value={music}
        media={media.filter((item): item is InvitationAudioMedia => item.kind === "audio")}
        onChange={(next) => updateModule("music", next)}
        onMediaChange={onMediaChange}
        onScheduleDeletion={onScheduleMediaDeletion}
        onBusyChange={onMediaBusyChange}
      /> : null}
    </section> : null}
  </>;
}

export function InvitationModuleEditor({ template, invitationId, media = [], value, onChange, onMediaChange = () => undefined, onScheduleMediaDeletion = () => undefined, onMediaBusyChange = () => undefined }: {
  template: InvitationTemplate;
  invitationId?: string;
  media?: InvitationOwnedMedia[];
  value: InvitationModuleContent;
  onChange(value: InvitationModuleContent): void;
  onMediaChange?(media: InvitationOwnedMedia): void;
  onScheduleMediaDeletion?(mediaId: string): void;
  onMediaBusyChange?(busy: boolean): void;
}) {
  const required = new Set(template.requiredModules);
  const toggleable = template.supportedModules.filter((id) => !required.has(id));
  const hasImageWorkflow = template.supportedModules.includes("couple-profile") && template.supportedModules.includes("gallery");
  const weddingContent = toWeddingRenderModel(value, false);
  const maps = template.supportedModules.includes("maps") ? moduleRegistry.maps.schema.parse(value.modules.maps) : null;
  return <div className="form" data-template-editor data-module-editor>
    <section className="form-section">
      <h2>Modul undangan</h2>
      <p>Modul wajib selalu aktif. Modul opsional dapat disimpan tanpa harus ditampilkan oleh template.</p>
      <div className="form two-column">{toggleable.map((id) => <label className="check-field" key={id}>
        <input type="checkbox" checked={value.moduleState[id]?.enabled ?? false} onChange={(event) => onChange({ ...value, moduleState: { ...value.moduleState, [id]: { enabled: event.target.checked } } })} />
        <span>{moduleRegistry[id].name}</span>
      </label>)}</div>
    </section>
    <WeddingModuleEditor value={weddingContent} hideMediaFields={hasImageWorkflow} onChange={(next) => onChange(updateFromWeddingRenderModel(value, next))} />
    {maps ? <MapsModuleEditor content={weddingContent} value={maps} onContentChange={(next) => onChange(updateFromWeddingRenderModel(value, next))} onChange={(next) => onChange({ ...value, modules: { ...value.modules, maps: next } })} /> : null}
    {template.supportedModules.includes("gift") ? <GiftModuleEditor value={GiftModuleSchema.parse(value.modules.gift)} onChange={(gift) => onChange({ ...value, modules: { ...value.modules, gift } })} /> : null}
    {hasImageWorkflow && invitationId ? <DaztoreImageMediaEditor
      invitationId={invitationId}
      value={toWeddingRenderModel(value, false)}
      media={media.filter((item): item is InvitationImageMedia => item.kind === "image")}
      onChange={(next) => onChange(updateFromWeddingRenderModel(value, next))}
      onMediaChange={onMediaChange}
      onScheduleDeletion={onScheduleMediaDeletion}
      onBusyChange={onMediaBusyChange}
    /> : null}
    <ModuleConfigurationEditors template={template} invitationId={invitationId} media={media} value={value} onChange={onChange} onMediaChange={onMediaChange} onScheduleMediaDeletion={onScheduleMediaDeletion} onMediaBusyChange={onMediaBusyChange} />
  </div>;
}
