"use client";

import { useMemo, useState } from "react";
import type { InvitationCategoryKey, InvitationTemplate, InvitationTheme } from "@/domain";

interface CategoryChoice { key: InvitationCategoryKey; version: number; name: string; }

export function InvitationDesignSelector({ categories, templates, themes }: { categories: CategoryChoice[]; templates: InvitationTemplate[]; themes: InvitationTheme[] }) {
  const [categoryId, setCategoryId] = useState("wedding@1");
  const compatibleTemplates = useMemo(() => templates.filter((template) => `${template.categoryKey}@${template.categoryVersion}` === categoryId), [categoryId, templates]);
  const [templateId, setTemplateId] = useState("");
  const selectedTemplate = compatibleTemplates.some((template) => `${template.key}@${template.version}` === templateId) ? templateId : compatibleTemplates[0] ? `${compatibleTemplates[0].key}@${compatibleTemplates[0].version}` : "";
  const compatibleThemes = themes.filter((theme) => `${theme.templateKey}@${theme.templateVersion}` === selectedTemplate);
  const defaultTheme = compatibleThemes.find((theme) => theme.isDefault) ?? compatibleThemes[0];
  return <>
    <label className="field"><span>Kategori</span><select name="category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setTemplateId(""); }}>{categories.map((category) => <option key={`${category.key}@${category.version}`} value={`${category.key}@${category.version}`}>{category.name}</option>)}</select><small>Kategori menentukan kapabilitas dan modul bisnis undangan.</small></label>
    <label className="field"><span>Template</span><select name="template" value={selectedTemplate} onChange={(event) => setTemplateId(event.target.value)} required><option value="" disabled>{compatibleTemplates.length ? "Pilih template" : "Belum ada template untuk kategori ini"}</option>{compatibleTemplates.map((template) => <option key={`${template.key}@${template.version}`} value={`${template.key}@${template.version}`}>{template.name}</option>)}</select></label>
    <label className="field"><span>Tema</span><select key={selectedTemplate} name="theme" defaultValue={defaultTheme ? `${defaultTheme.key}@${defaultTheme.version}` : ""} required><option value="" disabled>{compatibleThemes.length ? "Pilih tema" : "Pilih template terlebih dahulu"}</option>{compatibleThemes.map((theme) => <option key={`${theme.key}@${theme.version}`} value={`${theme.key}@${theme.version}`}>{theme.name}</option>)}</select><small>Tema hanya mengubah token visual yang tervalidasi.</small></label>
  </>;
}
