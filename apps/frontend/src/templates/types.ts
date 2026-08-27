import type { ComponentType } from "react";
import type { Invitation, InvitationTemplate, InvitationTheme } from "@/domain";
import type { WeddingRenderModel } from "@/invitation-modules/schemas";
import type { InvitationModuleContent } from "@/invitation-modules/content";
import type { TemplateThemeDefinition } from "@/themes/types";

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
  availability: "production" | "compatibility";
  activeContentSchemaVersion: number;
  component: ComponentType<InvitationTemplateProps<WeddingRenderModel>>;
  compatibleThemes: readonly string[];
  themes: readonly InvitationTheme[];
  themeDefinition: TemplateThemeDefinition;
  sectionRenderers: Readonly<Record<string, true>>;
}
