import type { InvitationTemplateProps } from "./types";
import { getTemplateModule } from "./registry";

export function TemplateRenderer(props: InvitationTemplateProps) {
  const templateModule = getTemplateModule(props.invitation.templateKey, props.invitation.templateVersion);
  if (!templateModule) return <main className="state-card"><h1>Template tidak tersedia</h1><p>Template undangan ini belum terdaftar pada aplikasi.</p></main>;
  const Component = templateModule.component;
  return <Component {...props} />;
}
