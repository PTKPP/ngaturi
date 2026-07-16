import type { ComponentType } from "react";
import type { Invitation, InvitationTemplate } from "@/domain";

export interface InvitationTemplateProps { invitation: Invitation; preview?: boolean; }
export interface TemplateModule { manifest: InvitationTemplate; component: ComponentType<InvitationTemplateProps>; }
