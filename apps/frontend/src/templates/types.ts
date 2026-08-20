import type { ComponentType } from "react";
import type { Invitation, InvitationTemplate, InvitationTheme } from "@/domain";

export interface InvitationTemplateProps { invitation: Invitation; theme: InvitationTheme; preview?: boolean; }
export interface TemplateModule { manifest: InvitationTemplate; component: ComponentType<InvitationTemplateProps>; }
