import { TemplatesSchema, type InvitationTemplate } from "@/domain";
import type { StoragePort, TemplateRepository } from "../contracts";
import { STORAGE_KEYS } from "./keys";
import { readValidated } from "./storage";

export class MockTemplateRepository implements TemplateRepository {
  constructor(private readonly storage: StoragePort) {}
  list(): InvitationTemplate[] { return readValidated(this.storage, STORAGE_KEYS.templates, TemplatesSchema); }
  find(key: string, version: number): InvitationTemplate | null {
    return this.list().find((item) => item.key === key && item.version === version) ?? null;
  }
}
