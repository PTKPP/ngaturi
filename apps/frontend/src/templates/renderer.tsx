import type { Invitation } from "@/domain";
import { getTemplateModule } from "./registry";
import { getRegisteredTheme } from "@/themes/registry";

export function TemplateRenderer({ invitation, preview = false }: { invitation: Invitation; preview?: boolean }) {
  const templateModule = getTemplateModule(invitation.templateKey, invitation.templateVersion);
  if (!templateModule) return <main className="state-card"><h1>Template tidak tersedia</h1><p>Template undangan ini belum terdaftar pada aplikasi.</p></main>;
  const theme = getRegisteredTheme(invitation.themeKey, invitation.themeVersion);
  if (!theme || theme.templateKey !== invitation.templateKey || theme.templateVersion !== invitation.templateVersion || !templateModule.compatibleThemes.includes(`${theme.key}@${theme.version}`)) {
    return <main className="state-card"><h1>Tema tidak tersedia</h1><p>Tema undangan tidak terdaftar atau tidak kompatibel dengan template.</p></main>;
  }
  const parsed = templateModule.contentSchema.safeParse(invitation.content);
  if (!parsed.success || invitation.contentSchemaVersion !== templateModule.activeContentSchemaVersion) {
    return <main className="state-card"><h1>Konten tidak kompatibel</h1><p>Konten undangan tidak sesuai dengan versi template yang tersimpan.</p></main>;
  }
  const Component = templateModule.component;
  const { content: storedContent, ...base } = invitation;
  void storedContent;
  return <Component invitation={base} content={parsed.data} theme={theme} preview={preview} />;
}
