import type { ComponentType } from "react";
import type { Invitation, InvitationTemplate, InvitationTheme } from "@/domain";
import type { WeddingRenderModel } from "@/invitation-modules/schemas";
import type { InvitationModuleContent } from "@/invitation-modules/content";

export interface InvitationTemplateProps<TContent> {
  invitation: Omit<Invitation, "content">;
  content: TContent;
  theme: InvitationTheme;
  moduleContent: InvitationModuleContent;
  preview?: boolean;
}

export interface TemplateEditorProps<TContent> { value: TContent; onChange(value: TContent): void; }
export interface TemplateModule {
  manifest: InvitationTemplate;
  activeContentSchemaVersion: number;
  component: ComponentType<InvitationTemplateProps<WeddingRenderModel>>;
  compatibleThemes: readonly string[];
  sectionRenderers: Readonly<Record<string, true>>;
}
