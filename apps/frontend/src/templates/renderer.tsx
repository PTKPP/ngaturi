import type { Invitation } from "@/domain";
import { getTemplateModule } from "./registry";
import { parseTemplateContent } from "./registry";
import { resolveRegisteredTheme } from "@/themes/registry";
import { toWeddingRenderModel } from "@/invitation-modules/content";

export function TemplateRenderer({ invitation, preview = false }: { invitation: Invitation; preview?: boolean }) {
  const templateModule = getTemplateModule(invitation.templateKey, invitation.templateVersion);
  if (!templateModule) return <main className="state-card"><h1>Template tidak tersedia</h1><p>Template undangan ini belum terdaftar pada aplikasi.</p></main>;
  const resolved = resolveRegisteredTheme(invitation.templateKey, invitation.templateVersion, invitation.themeKey, invitation.themeVersion, invitation.themeOverrides);
  if (!resolved || !templateModule.compatibleThemes.includes(`${resolved.theme.key}@${resolved.theme.version}`)) return <main className="state-card"><h1>Tema tidak tersedia</h1><p>Tema default template tidak tersedia.</p></main>;
  let content;
  try { content = toWeddingRenderModel(parseTemplateContent(invitation.templateKey, invitation.templateVersion, invitation.contentSchemaVersion, invitation.content)); }
  catch {
    return <main className="state-card"><h1>Konten tidak kompatibel</h1><p>Konten undangan tidak sesuai dengan versi template yang tersimpan.</p></main>;
  }
  const Component = templateModule.component;
  const { content: storedContent, ...base } = invitation;
  void storedContent;
  return <Component invitation={base} content={content} theme={resolved.theme} preview={preview} />;
}
