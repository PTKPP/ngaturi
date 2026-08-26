import type { User } from "@/domain";
import type { ApplicationRepository } from "@/repositories/contracts";
import { validateRouteSlug } from "@/services/route-service";

export class AdminApplicationService {
  constructor(private readonly repository: ApplicationRepository) {}
  private assertAdmin(actor: User) { if (actor.role !== "admin") throw new Error("Operasi ini hanya dapat dilakukan admin."); }
  async setQuota(actor: User, ownerId: string, quota: number) { this.assertAdmin(actor); if (!Number.isInteger(quota) || quota < 0) throw new Error("Kuota harus bilangan bulat non-negatif."); return this.repository.setRouteQuota(ownerId, quota); }
  async preassign(actor: User, ownerId: string, slug: string) { this.assertAdmin(actor); return this.repository.preassignRoute(ownerId, validateRouteSlug(slug)); }
  async reassign(actor: User, routeId: string, slug: string, confirmed: boolean) { this.assertAdmin(actor); if (!confirmed) throw new Error("Konfirmasi penggantian slug diperlukan."); return this.repository.reassignRoute(routeId, validateRouteSlug(slug), true); }
}
