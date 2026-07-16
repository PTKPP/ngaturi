import type { InvitationTemplate } from "@/domain";

export interface TemplateRepository {
  list(): InvitationTemplate[];
  find(key: string, version: number): InvitationTemplate | null;
}
