"use client";

import type { InvitationTemplate } from "@/domain";
import { WeddingModuleEditor } from "./wedding-editor";
import { moduleRegistry } from "./registry";
import { toWeddingRenderModel, updateFromWeddingRenderModel, type InvitationModuleContent } from "./content";

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
  </div>;
}
