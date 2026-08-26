import type { ComponentType } from "react";
import type { Invitation, InvitationTemplate, InvitationTheme } from "@/domain";
import type { WeddingRenderModel } from "@/invitation-modules/schemas";

export interface InvitationTemplateProps<TContent> {
  invitation: Omit<Invitation, "content">;
  content: TContent;
  theme: InvitationTheme;
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
