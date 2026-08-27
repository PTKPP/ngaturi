import { InvitationThemesSchema, type InvitationTheme } from "@/domain";
import type { StoragePort, ThemeRepository } from "../contracts";
import { STORAGE_KEYS } from "./keys";
import { readValidated } from "./storage";

export class MockThemeRepository implements ThemeRepository {
  constructor(private readonly storage: StoragePort) {}
  list(): InvitationTheme[] { return readValidated(this.storage, STORAGE_KEYS.themes, InvitationThemesSchema); }
  find(key: string, version: number): InvitationTheme | null { return this.list().find((item) => item.key === key && item.version === version) ?? null; }
  listForTemplate(templateKey: string, templateVersion: number): InvitationTheme[] {
    return this.list().filter((item) => item.templateKey === templateKey && item.templateVersion === templateVersion);
  }
  findDefault(templateKey: string, templateVersion: number): InvitationTheme | null {
    return this.listForTemplate(templateKey, templateVersion).find((item) => item.isDefault && item.status === "active") ?? null;
  }
}
