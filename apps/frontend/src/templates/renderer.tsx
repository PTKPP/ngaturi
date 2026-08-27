import type { Invitation } from "@/domain";
import { getTemplateModule } from "./registry";
import { parseTemplateContent } from "./registry";
import { resolveRegisteredTheme } from "@/themes/registry";
import { toWeddingRenderModel } from "@/invitation-modules/content";
import { isModuleEnabled } from "@/invitation-modules/content";
import { InvitationMusicSchema, resolveInvitationMusic } from "@/invitation-music/registry";
import { InvitationExperienceShell } from "./shared/InvitationExperienceShell";
import { themeCssVariables } from "@/themes/registry";

export function TemplateRenderer({ invitation, preview = false }: { invitation: Invitation; preview?: boolean }) {
  const templateModule = getTemplateModule(invitation.templateKey, invitation.templateVersion);
  if (!templateModule) return <main className="state-card"><h1>Template tidak tersedia</h1><p>Template undangan ini belum terdaftar pada aplikasi.</p></main>;
  const resolved = resolveRegisteredTheme(invitation.templateKey, invitation.templateVersion, invitation.themeKey, invitation.themeVersion, invitation.themeOverrides);
  if (!resolved || !templateModule.compatibleThemes.includes(`${resolved.theme.key}@${resolved.theme.version}`)) return <main className="state-card"><h1>Tema tidak tersedia</h1><p>Tema default template tidak tersedia.</p></main>;
  let moduleContent;
  let content;
  try {
    moduleContent = parseTemplateContent(invitation.templateKey, invitation.templateVersion, invitation.contentSchemaVersion, invitation.content);
    content = toWeddingRenderModel(moduleContent);
  }
  catch {
    return <main className="state-card"><h1>Konten tidak kompatibel</h1><p>Konten undangan tidak sesuai dengan versi template yang tersimpan.</p></main>;
  }
  const Component = templateModule.component;
  const { content: storedContent, ...base } = invitation;
  void storedContent;
  const musicValue = isModuleEnabled(moduleContent, "music") ? InvitationMusicSchema.parse(moduleContent.modules.music) : null;
  const music = musicValue ? resolveInvitationMusic(musicValue) : null;
  return <InvitationExperienceShell music={music} preview={preview} style={themeCssVariables(resolved.theme)}>
    <Component invitation={base} content={content} moduleContent={moduleContent} theme={resolved.theme} preview={preview} />
  </InvitationExperienceShell>;
}
