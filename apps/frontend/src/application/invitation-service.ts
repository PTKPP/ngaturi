import type { Invitation, InvitationStatus, User } from "@/domain";
import { InvitationSchema } from "@/domain";
import type { ApplicationRepository } from "@/repositories/contracts";
import { getTemplateModule, parseTemplateContent } from "@/templates/registry";
import { adaptContentToTemplate, createTemplateContent } from "@/invitation-modules/content";

export interface CreateInvitationCommand {
  title: string; routeId?: string; slug?: string;
  categoryKey: string; categoryVersion: number;
  templateKey: string; templateVersion: number; themeKey: string; themeVersion: number;
}

export class InvitationApplicationService {
  constructor(private readonly repository: ApplicationRepository) {}

  async create(actor: User, command: CreateInvitationCommand) {
    const templateModule = getTemplateModule(command.templateKey, command.templateVersion);
    if (!templateModule) throw new Error("Template tidak tersedia.");
    if (templateModule.manifest.categoryKey !== command.categoryKey || templateModule.manifest.categoryVersion !== command.categoryVersion) throw new Error("Template tidak kompatibel dengan kategori undangan.");
    const themes = await this.repository.listThemes();
    const theme = themes.find((item) => item.key === command.themeKey && item.version === command.themeVersion && item.templateKey === command.templateKey && item.templateVersion === command.templateVersion && item.status === "active");
    if (!theme || !templateModule.compatibleThemes.includes(`${theme.key}@${theme.version}`)) throw new Error("Tema tidak kompatibel dengan template.");
    if (Boolean(command.routeId) === Boolean(command.slug)) throw new Error("Pilih tepat satu route yang tersedia atau slug baru.");
    return this.repository.createInvitation(actor.id, { ...command, themeOverrides: {}, contentSchemaVersion: templateModule.activeContentSchemaVersion, content: createTemplateContent(templateModule.manifest) });
  }

  async save(actor: User, candidate: Invitation) {
    const current = await this.owned(actor, candidate.id);
    if (candidate.ownerId !== actor.id || candidate.ownerId !== current.ownerId || candidate.routeId !== current.routeId) throw new Error("Owner dan route undangan tidak dapat diubah.");
    const changedTemplate = candidate.templateKey !== current.templateKey || candidate.templateVersion !== current.templateVersion;
    if (changedTemplate) throw new Error("Gunakan operasi ganti template dengan konfirmasi eksplisit.");
    const templateModule = getTemplateModule(candidate.templateKey, candidate.templateVersion);
    if (!templateModule || templateModule.manifest.categoryKey !== candidate.categoryKey || templateModule.manifest.categoryVersion !== candidate.categoryVersion) throw new Error("Kategori dan template undangan tidak kompatibel.");
    const themes = await this.repository.listThemes();
    const theme = themes.find((item) => item.key === candidate.themeKey && item.version === candidate.themeVersion && item.templateKey === candidate.templateKey && item.templateVersion === candidate.templateVersion && item.status === "active");
    if (!theme || !templateModule.compatibleThemes.includes(`${theme.key}@${theme.version}`)) throw new Error("Tema tidak kompatibel dengan template.");
    const parsedContent = parseTemplateContent(candidate.templateKey, candidate.templateVersion, candidate.contentSchemaVersion, candidate.content);
    const contentChanged = candidate.contentSchemaVersion !== current.contentSchemaVersion || JSON.stringify(candidate.content) !== JSON.stringify(current.content);
    const themeChanged = candidate.themeKey !== current.themeKey || candidate.themeVersion !== current.themeVersion || JSON.stringify(candidate.themeOverrides) !== JSON.stringify(current.themeOverrides);
    const themeOnly = themeChanged && !contentChanged && candidate.title === current.title && candidate.status === current.status;
    const normalizeContent = contentChanged || (candidate.contentSchemaVersion !== templateModule.activeContentSchemaVersion && !themeOnly && current.status !== "published");
    return this.repository.updateInvitation(actor.id, InvitationSchema.parse({ ...candidate, contentSchemaVersion: normalizeContent ? templateModule.activeContentSchemaVersion : candidate.contentSchemaVersion, content: normalizeContent ? parsedContent : candidate.content, updatedAt: new Date().toISOString() }));
  }

  async switchTemplate(actor: User, id: string, templateKey: string, templateVersion: number, confirmDiscard = false) {
    void confirmDiscard;
    const current = await this.owned(actor, id);
    if (current.status !== "draft") throw new Error("Template hanya dapat diubah saat undangan berstatus draft.");
    const templateModule = getTemplateModule(templateKey, templateVersion);
    if (!templateModule) throw new Error("Template tidak tersedia.");
    if (templateModule.manifest.categoryKey !== current.categoryKey || templateModule.manifest.categoryVersion !== current.categoryVersion) throw new Error("Template lintas kategori tidak dapat dipilih.");
    const content = adaptContentToTemplate(parseTemplateContent(current.templateKey, current.templateVersion, current.contentSchemaVersion, current.content), templateModule.manifest);
    const themes = await this.repository.listThemes();
    const theme = themes.find((item) => item.templateKey === templateKey && item.templateVersion === templateVersion && item.isDefault && item.status === "active");
    if (!theme || !templateModule.compatibleThemes.includes(`${theme.key}@${theme.version}`)) throw new Error("Tema default template tidak tersedia.");
    return this.repository.updateInvitation(actor.id, InvitationSchema.parse({ ...current, templateKey, templateVersion, contentSchemaVersion: templateModule.activeContentSchemaVersion, themeKey: theme.key, themeVersion: theme.version, themeOverrides: {}, content, updatedAt: new Date().toISOString() }));
  }

  async setStatus(actor: User, id: string, status: InvitationStatus) {
    const current = await this.owned(actor, id);
    const templateModule = getTemplateModule(current.templateKey, current.templateVersion);
    if (!templateModule) throw new Error("Template tidak tersedia.");
    const parsedContent = parseTemplateContent(current.templateKey, current.templateVersion, current.contentSchemaVersion, current.content);
    const normalizeContent = status === "published" && current.status !== "published";
    return this.repository.updateInvitation(actor.id, InvitationSchema.parse({ ...current, content: normalizeContent ? parsedContent : current.content, contentSchemaVersion: normalizeContent ? templateModule.activeContentSchemaVersion : current.contentSchemaVersion, status, publishedAt: status === "published" ? (current.publishedAt ?? new Date().toISOString()) : null, updatedAt: new Date().toISOString() }));
  }

  async owned(actor: User, id: string) {
    const invitation = await this.repository.findOwnedInvitation(actor.id, id);
    if (!invitation) throw new Error("Undangan tidak ditemukan atau bukan milik Anda.");
    parseTemplateContent(invitation.templateKey, invitation.templateVersion, invitation.contentSchemaVersion, invitation.content);
    return invitation;
  }
}
