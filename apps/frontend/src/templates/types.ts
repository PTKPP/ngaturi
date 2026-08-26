import type { ComponentType } from "react";
import type { z } from "zod";
import type { Invitation, InvitationTemplate, InvitationTheme } from "@/domain";

export interface InvitationTemplateProps<TContent> {
  invitation: Omit<Invitation, "content">;
  content: TContent;
  theme: InvitationTheme;
  preview?: boolean;
}

export interface TemplateEditorProps<TContent> { value: TContent; onChange(value: TContent): void; }
export interface ContentConversion<TContent> { content: TContent; discardedFields: string[]; }
export interface TemplateModule<TContent> {
  manifest: InvitationTemplate;
  activeContentSchemaVersion: number;
  contentSchema: z.ZodType<TContent>;
  createDefaultContent(): TContent;
  editor: ComponentType<TemplateEditorProps<TContent>>;
  component: ComponentType<InvitationTemplateProps<TContent>>;
  compatibleThemes: readonly string[];
  migrateContent(version: number, content: unknown): TContent;
  convertContent(content: unknown): ContentConversion<TContent>;
}
