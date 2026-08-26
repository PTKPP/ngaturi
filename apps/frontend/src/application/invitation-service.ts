import type { Invitation, InvitationStatus, User } from "@/domain";
import { InvitationSchema } from "@/domain";
import type { ApplicationRepository } from "@/repositories/contracts";
import { getTemplateModule, parseTemplateContent } from "@/templates/registry";

export interface CreateInvitationCommand {
  title: string; routeId?: string; slug?: string;
  templateKey: string; templateVersion: number; themeKey: string; themeVersion: number;
}

export class InvitationApplicationService {
  constructor(private readonly repository: ApplicationRepository) {}

  async create(actor: User, command: CreateInvitationCommand) {
    const templateModule = getTemplateModule(command.templateKey, command.templateVersion);
    if (!templateModule) throw new Error("Template tidak tersedia.");
    const themes = await this.repository.listThemes();
    const theme = themes.find((item) => item.key === command.themeKey && item.version === command.themeVersion && item.templateKey === command.templateKey && item.templateVersion === command.templateVersion && item.status === "active");
    if (!theme || !templateModule.compatibleThemes.includes(`${theme.key}@${theme.version}`)) throw new Error("Tema tidak kompatibel dengan template.");
    if (Boolean(command.routeId) === Boolean(command.slug)) throw new Error("Pilih tepat satu route yang tersedia atau slug baru.");
    return this.repository.createInvitation(actor.id, { ...command, contentSchemaVersion: templateModule.activeContentSchemaVersion, content: templateModule.createDefaultContent() });
  }

  async save(actor: User, candidate: Invitation) {
    const current = await this.owned(actor, candidate.id);
    if (candidate.ownerId !== actor.id || candidate.ownerId !== current.ownerId || candidate.routeId !== current.routeId) throw new Error("Owner dan route undangan tidak dapat diubah.");
    const changedTemplate = candidate.templateKey !== current.templateKey || candidate.templateVersion !== current.templateVersion;
    if (changedTemplate) throw new Error("Gunakan operasi ganti template dengan konfirmasi eksplisit.");
    const content = parseTemplateContent(candidate.templateKey, candidate.templateVersion, candidate.contentSchemaVersion, candidate.content);
    return this.repository.updateInvitation(actor.id, InvitationSchema.parse({ ...candidate, content, updatedAt: new Date().toISOString() }));
  }

  async switchTemplate(actor: User, id: string, templateKey: string, templateVersion: number, confirmDiscard: boolean) {
    const current = await this.owned(actor, id);
    if (current.status !== "draft") throw new Error("Template hanya dapat diubah saat undangan berstatus draft.");
    const templateModule = getTemplateModule(templateKey, templateVersion);
    if (!templateModule) throw new Error("Template tidak tersedia.");
    const conversion = templateModule.convertContent(current.content);
    if (conversion.discardedFields.length && !confirmDiscard) throw new Error(`Konfirmasi diperlukan untuk membuang field: ${conversion.discardedFields.join(", ")}.`);
    const themes = await this.repository.listThemes();
    const theme = themes.find((item) => item.templateKey === templateKey && item.templateVersion === templateVersion && item.isDefault && item.status === "active");
    if (!theme || !templateModule.compatibleThemes.includes(`${theme.key}@${theme.version}`)) throw new Error("Tema default template tidak tersedia.");
    return this.repository.updateInvitation(actor.id, InvitationSchema.parse({ ...current, templateKey, templateVersion, contentSchemaVersion: templateModule.activeContentSchemaVersion, themeKey: theme.key, themeVersion: theme.version, content: conversion.content, updatedAt: new Date().toISOString() }));
  }

  async setStatus(actor: User, id: string, status: InvitationStatus) {
    const current = await this.owned(actor, id);
    parseTemplateContent(current.templateKey, current.templateVersion, current.contentSchemaVersion, current.content);
    return this.repository.updateInvitation(actor.id, InvitationSchema.parse({ ...current, status, publishedAt: status === "published" ? (current.publishedAt ?? new Date().toISOString()) : null, updatedAt: new Date().toISOString() }));
  }

  async owned(actor: User, id: string) {
    const invitation = await this.repository.findOwnedInvitation(actor.id, id);
    if (!invitation) throw new Error("Undangan tidak ditemukan atau bukan milik Anda.");
    parseTemplateContent(invitation.templateKey, invitation.templateVersion, invitation.contentSchemaVersion, invitation.content);
    return invitation;
  }
}
