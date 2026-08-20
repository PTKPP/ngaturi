import type { InvitationTheme } from "@/domain";

export interface ThemeRepository {
  list(): InvitationTheme[];
  find(key: string, version: number): InvitationTheme | null;
  listForTemplate(templateKey: string, templateVersion: number): InvitationTheme[];
  findDefault(templateKey: string, templateVersion: number): InvitationTheme | null;
}
