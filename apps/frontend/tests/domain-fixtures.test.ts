import { describe, expect, it } from "vitest";
import { InvitationsSchema, TemplatesSchema, UsersSchema } from "@/domain";
import users from "../../../contracts/dummy-data/users.json";
import templates from "../../../contracts/dummy-data/templates.json";
import invitations from "../../../contracts/dummy-data/invitations.json";

describe("dummy data contract", () => {
  it("validates dummy users", () => { expect(UsersSchema.parse(users)).toHaveLength(3); });
  it("validates both dummy templates", () => { expect(TemplatesSchema.parse(templates).map((item) => `${item.key}@${item.version}`)).toEqual(["elegant-gold@1", "minimal-white@1"]); });
  it("validates draft and published invitations with multiple events", () => {
    const parsed = InvitationsSchema.parse(invitations);
    expect(parsed.map((item) => item.status)).toEqual(expect.arrayContaining(["draft", "published"]));
    expect(parsed.every((item) => item.events.length >= 2)).toBe(true);
  });
});
