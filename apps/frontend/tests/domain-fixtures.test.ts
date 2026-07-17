import { describe, expect, it } from "vitest";
import { FrontendContractSchema, InvitationSchema, InvitationsSchema, TemplatesSchema, UsersSchema } from "@/domain";
import users from "../../../contracts/dummy-data/users.json";
import templates from "../../../contracts/dummy-data/templates.json";
import invitations from "../../../contracts/dummy-data/invitations.json";

describe("dummy data contract", () => {
  it("validates dummy users", () => { expect(UsersSchema.parse(users)).toHaveLength(3); });
  it("validates all dummy templates", () => { expect(TemplatesSchema.parse(templates).map((item) => `${item.key}@${item.version}`)).toEqual(["elegant-gold@1", "minimal-white@1", "daztore-inv1@1"]); });
  it("validates draft and published invitations with multiple events", () => {
    const parsed = InvitationsSchema.parse(invitations);
    expect(parsed.map((item) => item.status)).toEqual(expect.arrayContaining(["draft", "published"]));
    expect(parsed.every((item) => item.events.length >= 2)).toBe(true);
  });
  it("validates owner and template references as one frontend contract", () => {
    expect(FrontendContractSchema.parse({ users, templates, invitations })).toMatchObject({
      users: expect.any(Array), templates: expect.any(Array), invitations: expect.any(Array),
    });
  });
  it("rejects duplicate slugs and missing owner or template references", () => {
    const duplicateSlug = structuredClone(invitations);
    duplicateSlug[1].slug = duplicateSlug[0].slug;
    expect(() => FrontendContractSchema.parse({ users, templates, invitations: duplicateSlug })).toThrow("Slug undangan harus unik");

    const missingOwner = structuredClone(invitations);
    missingOwner[0].ownerId = "usr_missing";
    expect(() => FrontendContractSchema.parse({ users, templates, invitations: missingOwner })).toThrow("Owner undangan harus merujuk user");

    const missingTemplate = structuredClone(invitations);
    missingTemplate[0].templateKey = "missing-theme";
    expect(() => FrontendContractSchema.parse({ users, templates, invitations: missingTemplate })).toThrow("Template undangan harus tersedia");
  });
  it("rejects invalid event chronology and ordering", () => {
    const invalidTime = structuredClone(invitations[0]);
    invalidTime.events[0].endTime = invalidTime.events[0].startTime;
    expect(() => InvitationSchema.parse(invalidTime)).toThrow("Waktu selesai harus setelah waktu mulai");

    const duplicateOrder = structuredClone(invitations[0]);
    duplicateOrder.events[1].sortOrder = duplicateOrder.events[0].sortOrder;
    expect(() => InvitationSchema.parse(duplicateOrder)).toThrow("Urutan acara harus unik");

    const invalidClock = structuredClone(invitations[0]);
    invalidClock.events[0].startTime = "29:99";
    expect(() => InvitationSchema.parse(invalidClock)).toThrow("format 24 jam HH:MM");
  });
});
