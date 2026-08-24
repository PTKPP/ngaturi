import type { InvitationTemplateProps } from "./types";
import { getTemplateModule } from "./registry";
import { getRegisteredTheme } from "@/themes/registry";

export function TemplateRenderer(props: Omit<InvitationTemplateProps, "theme">) {
  const templateModule = getTemplateModule(props.invitation.templateKey, props.invitation.templateVersion);
  if (!templateModule) return <main className="state-card"><h1>Template tidak tersedia</h1><p>Template undangan ini belum terdaftar pada aplikasi.</p></main>;
  const theme = getRegisteredTheme(props.invitation.themeKey, props.invitation.themeVersion);
  if (!theme || theme.templateKey !== props.invitation.templateKey || theme.templateVersion !== props.invitation.templateVersion) {
    return <main className="state-card"><h1>Tema tidak tersedia</h1><p>Tema undangan tidak terdaftar atau tidak kompatibel dengan template.</p></main>;
  }
  const Component = templateModule.component;
  return <Component {...props} theme={theme} />;
}
