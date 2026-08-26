import { describe, expect, it } from "vitest";
import { FrontendContractSchema, InvitationRoutesSchema, InvitationsSchema, InvitationThemesSchema, TemplatesSchema, UsersSchema } from "@/domain";
import users from "../../../contracts/dummy-data/users.json";
import routes from "../../../contracts/dummy-data/routes.json";
import templates from "../../../contracts/dummy-data/templates.json";
import themes from "../../../contracts/dummy-data/themes.json";
import invitations from "../../../contracts/dummy-data/invitations.json";
import { parseTemplateContent } from "@/templates/registry";

const contract = () => structuredClone({ users, routes, templates, themes, invitations });

describe("dummy data contract", () => {
  it("validates dummy users with non-negative route quota", () => {
    const parsed = UsersSchema.parse(users);
    expect(parsed).toHaveLength(3);
    expect(parsed.every((user) => Number.isInteger(user.routeQuota) && user.routeQuota >= 0)).toBe(true);
  });
  it("treats the three structural renderers as templates", () => {
    expect(TemplatesSchema.parse(templates).map((item) => `${item.key}@${item.version}`)).toEqual(["elegant-gold@1", "minimal-white@1", "daztore-inv1@1"]);
  });
  it("registers at least two compatible themes including one default for every template", () => {
    const parsed = InvitationThemesSchema.parse(themes);
    for (const template of templates) {
      const compatible = parsed.filter((theme) => theme.templateKey === template.key && theme.templateVersion === template.version);
      expect(compatible.length).toBeGreaterThanOrEqual(2);
      expect(compatible.filter((theme) => theme.isDefault && theme.status === "active")).toHaveLength(1);
    }
  });
  it("validates routes and invitations with existing event rules", () => {
    expect(InvitationRoutesSchema.parse(routes)).toHaveLength(3);
    const parsed = InvitationsSchema.parse(invitations);
    expect(parsed.map((item) => item.status)).toEqual(expect.arrayContaining(["draft", "published"]));
    expect(parsed.every((item) => parseTemplateContent(item.templateKey, item.templateVersion, item.contentSchemaVersion, item.content).events.length >= 2)).toBe(true);
  });
  it("validates the unified frontend contract", () => {
    expect(FrontendContractSchema.parse(contract())).toMatchObject({ users: expect.any(Array), routes: expect.any(Array), themes: expect.any(Array), invitations: expect.any(Array) });
  });
  it("rejects duplicate global route slugs, missing route owners, and quota overflow", () => {
    const duplicate = contract(); duplicate.routes[1].slug = duplicate.routes[0].slug;
    expect(() => FrontendContractSchema.parse(duplicate)).toThrow("Slug route harus unik secara global");
    const missingOwner = contract(); missingOwner.routes[0].ownerId = "usr_missing";
    expect(() => FrontendContractSchema.parse(missingOwner)).toThrow("Owner route harus merujuk user");
    const overflow = contract(); overflow.users.find((user) => user.id === "usr_owner_demo")!.routeQuota = 1;
    expect(() => FrontendContractSchema.parse(overflow)).toThrow("melebihi kuota owner");
  });
  it("rejects reused routes, owner mismatch, and invalid template-theme combinations", () => {
    const reused = contract(); reused.invitations[1].routeId = reused.invitations[0].routeId;
    expect(() => FrontendContractSchema.parse(reused)).toThrow("Satu route hanya boleh digunakan satu undangan");
    const mismatch = contract(); mismatch.invitations[0].ownerId = "usr_admin_demo";
    expect(() => FrontendContractSchema.parse(mismatch)).toThrow("Owner undangan harus sama dengan owner route");
    const invalidTheme = contract(); invalidTheme.invitations[0].themeKey = "elegant-gold-default";
    expect(() => FrontendContractSchema.parse(invalidTheme)).toThrow("Tema undangan harus kompatibel");
  });
  it("keeps event IDs/order and end-time validation intact", () => {
    const duplicateOrder = contract(); duplicateOrder.invitations[0].content.events[1].sortOrder = 0;
    expect(() => parseTemplateContent("minimal-white", 1, 1, duplicateOrder.invitations[0].content)).toThrow("Urutan acara harus unik");
    const invalidTime = contract(); invalidTime.invitations[0].content.events[0].endTime = "07:00";
    expect(() => parseTemplateContent("minimal-white", 1, 1, invalidTime.invitations[0].content)).toThrow("Waktu selesai harus setelah waktu mulai");
  });
});
