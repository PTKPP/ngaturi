import {
  FrontendContractSchema, InvitationRouteSchema, InvitationSchema,
  type Invitation, type InvitationRoute, type InvitationTheme, type Session,
} from "@/domain";
import type {
  InvitationRepository, RouteRepository, TemplateRepository, ThemeRepository, UserRepository,
} from "@/repositories/contracts";
import { assertValidSession } from "./authorization";
import { createPrototypeId } from "./id";
import { validateRouteSlug } from "./route-service";
import { getTemplateModule, parseTemplateContent } from "@/templates/registry";
import { adaptContentToTemplate, createTemplateContent } from "@/invitation-modules/content";

export type InvitationRouteInput = { mode: "existing"; routeId: string } | { mode: "new"; slug: string };
export interface InvitationDraftInput {
  title: string;
  route: InvitationRouteInput;
  categoryKey?: string;
  categoryVersion?: number;
  templateKey: string;
  templateVersion: number;
  themeKey: string;
  themeVersion: number;
}
export interface InvitationUpdateOptions { confirmDiscard?: boolean; }

export class InvitationService {
  constructor(
    private readonly invitations: InvitationRepository,
    private readonly routes: RouteRepository,
    private readonly templates: TemplateRepository,
    private readonly themes: ThemeRepository,
    private readonly users: UserRepository,
  ) {}

  listOwned(session: Session): Invitation[] {
    assertValidSession(session, this.users);
    return this.invitations.list().filter((item) => item.ownerId === session.userId);
  }
  getOwned(session: Session, id: string): Invitation {
    assertValidSession(session, this.users);
    const invitation = this.invitations.findById(id);
    if (!invitation || invitation.ownerId !== session.userId) throw new Error("Undangan tidak ditemukan atau bukan milik Anda.");
    return invitation;
  }
  findPublished(slug: string): Invitation | null {
    const route = this.routes.findBySlug(slug);
    if (!route) return null;
    const invitation = this.invitations.findByRouteId(route.id);
    return invitation?.status === "published" ? invitation : null;
  }
  create(session: Session, input: InvitationDraftInput): Invitation {
    const actor = assertValidSession(session, this.users);
    const theme = this.assertActiveSelection(input.templateKey, input.templateVersion, input.themeKey, input.themeVersion);
    const route = input.route.mode === "existing"
      ? this.validateExistingRoute(actor.id, input.route.routeId)
      : this.buildClaimedRoute(actor.id, actor.routeQuota, input.route.slug);
    const now = new Date().toISOString();
    const id = createPrototypeId("inv");
    const templateModule = getTemplateModule(input.templateKey, input.templateVersion);
    if (!templateModule) throw new Error("Template tidak tersedia.");
    const categoryKey = input.categoryKey ?? templateModule.manifest.categoryKey;
    const categoryVersion = input.categoryVersion ?? templateModule.manifest.categoryVersion;
    if (categoryKey !== templateModule.manifest.categoryKey || categoryVersion !== templateModule.manifest.categoryVersion) throw new Error("Template tidak kompatibel dengan kategori undangan.");
    const invitation = InvitationSchema.parse({
      id, ownerId: actor.id, routeId: route.id, title: input.title.trim(),
      categoryKey, categoryVersion,
      templateKey: input.templateKey, templateVersion: input.templateVersion,
      contentSchemaVersion: templateModule.activeContentSchemaVersion,
      themeKey: theme.key, themeVersion: theme.version, themeOverrides: {}, status: "draft",
      content: createTemplateContent(templateModule.manifest), publishedAt: null, createdAt: now, updatedAt: now,
    });
    const isNewRoute = input.route.mode === "new";
    this.assertProspective(route, invitation, isNewRoute);
    if (!isNewRoute) return this.invitations.create(invitation);
    this.routes.create(route);
    try { return this.invitations.create(invitation); }
    catch (cause) { this.routes.delete(route.id); throw cause; }
  }
  update(session: Session, next: Invitation, options: InvitationUpdateOptions = {}): Invitation {
    const current = this.getOwned(session, next.id);
    if (next.ownerId !== current.ownerId) throw new Error("Pemilik undangan tidak boleh diubah.");
    if (next.routeId !== current.routeId) throw new Error("Route publik tidak dapat diubah oleh user.");
    const templateChanged = next.templateKey !== current.templateKey || next.templateVersion !== current.templateVersion;
    if (templateChanged && current.status !== "draft") throw new Error("Template hanya dapat diubah saat undangan berstatus draft.");
    const targetModule = getTemplateModule(next.templateKey, next.templateVersion);
    if (!targetModule) throw new Error("Template tidak tersedia.");
    if (targetModule.manifest.categoryKey !== current.categoryKey || targetModule.manifest.categoryVersion !== current.categoryVersion) throw new Error("Template lintas kategori tidak dapat dipilih.");
    void options;
    const theme = templateChanged ? this.getDefaultActiveTheme(next.templateKey, next.templateVersion) : this.assertActiveSelection(next.templateKey, next.templateVersion, next.themeKey, next.themeVersion);
    const rawContentChanged = next.contentSchemaVersion !== current.contentSchemaVersion || JSON.stringify(next.content) !== JSON.stringify(current.content);
    const statusRequiresV2 = next.status === "published" && current.status !== "published";
    const sourceContent = parseTemplateContent(current.templateKey, current.templateVersion, templateChanged ? current.contentSchemaVersion : next.contentSchemaVersion, templateChanged ? current.content : next.content);
    const contentSchemaVersion = templateChanged || rawContentChanged || statusRequiresV2 ? targetModule.activeContentSchemaVersion : next.contentSchemaVersion;
    const content = templateChanged ? adaptContentToTemplate(sourceContent, targetModule.manifest) : rawContentChanged || statusRequiresV2 ? sourceContent : next.content;
    const publishedAt = next.status === "published" ? (current.publishedAt ?? new Date().toISOString()) : null;
    const parsed = InvitationSchema.parse({ ...next, categoryKey: current.categoryKey, categoryVersion: current.categoryVersion, content, contentSchemaVersion, themeKey: theme.key, themeVersion: theme.version, themeOverrides: templateChanged ? {} : next.themeOverrides, publishedAt, updatedAt: new Date().toISOString() });
    const route = this.routes.findById(parsed.routeId);
    if (!route) throw new Error("Route undangan tidak tersedia.");
    this.assertProspective(route, parsed, false, parsed.id);
    return this.invitations.update(parsed);
  }
  publish(session: Session, id: string): Invitation { return this.setStatus(session, id, "published"); }
  unpublish(session: Session, id: string): Invitation { return this.setStatus(session, id, "inactive"); }
  returnToDraft(session: Session, id: string): Invitation { return this.setStatus(session, id, "draft"); }
  private setStatus(session: Session, id: string, status: Invitation["status"]): Invitation { return this.update(session, { ...this.getOwned(session, id), status }); }
  private validateExistingRoute(ownerId: string, routeId: string): InvitationRoute {
    const route = this.routes.findById(routeId);
    if (!route || route.ownerId !== ownerId) throw new Error("Route terpilih tidak tersedia untuk akun ini.");
    if (this.invitations.findByRouteId(routeId)) throw new Error("Route terpilih sudah digunakan undangan lain.");
    return route;
  }
  private buildClaimedRoute(ownerId: string, routeQuota: number, rawSlug: string): InvitationRoute {
    const used = this.routes.list().filter((route) => route.ownerId === ownerId).length;
    if (used >= routeQuota) throw new Error("Kuota route sudah penuh. Hubungi admin untuk tambahan akses route.");
    const slug = validateRouteSlug(rawSlug);
    if (this.routes.findBySlug(slug)) throw new Error("Slug route sudah digunakan.");
    const now = new Date().toISOString();
    return InvitationRouteSchema.parse({ id: createPrototypeId("route"), ownerId, slug, assignedBy: "user", createdAt: now, updatedAt: now });
  }
  private assertActiveSelection(templateKey: string, templateVersion: number, themeKey: string, themeVersion: number): InvitationTheme {
    const template = this.templates.find(templateKey, templateVersion);
    if (!template || template.status !== "active") throw new Error("Template tidak tersedia.");
    const theme = this.themes.find(themeKey, themeVersion);
    if (!theme || theme.status !== "active") throw new Error("Tema tidak tersedia.");
    if (theme.templateKey !== templateKey || theme.templateVersion !== templateVersion) throw new Error("Tema tidak kompatibel dengan template terpilih.");
    return theme;
  }
  private getDefaultActiveTheme(templateKey: string, templateVersion: number): InvitationTheme {
    const template = this.templates.find(templateKey, templateVersion);
    if (!template || template.status !== "active") throw new Error("Template tidak tersedia.");
    const theme = this.themes.findDefault(templateKey, templateVersion);
    if (!theme) throw new Error("Tema default aktif untuk template tidak tersedia.");
    return theme;
  }
  private assertProspective(route: InvitationRoute, invitation: Invitation, addRoute: boolean, replaceInvitationId?: string): void {
    const routes = addRoute ? [...this.routes.list(), route] : this.routes.list();
    const invitations = replaceInvitationId
      ? this.invitations.list().map((item) => item.id === replaceInvitationId ? invitation : item)
      : [...this.invitations.list(), invitation];
    FrontendContractSchema.parse({ users: this.users.list(), routes, templates: this.templates.list(), themes: this.themes.list(), invitations });
  }
}
