import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import invitations from "../../../contracts/dummy-data/invitations.json";
import { SupabaseApplicationRepository } from "@/repositories/supabase/application-repository";
import { mapInvitation, mapProfile, mapRoute } from "@/repositories/supabase/mappers";

vi.mock("server-only", () => ({}));

const sourceInvitation = invitations[0];

function invitationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: sourceInvitation.id,
    owner_id: sourceInvitation.ownerId,
    route_id: sourceInvitation.routeId,
    title: sourceInvitation.title,
    category_key: sourceInvitation.categoryKey,
    category_version: sourceInvitation.categoryVersion,
    template_key: sourceInvitation.templateKey,
    template_version: sourceInvitation.templateVersion,
    content_schema_version: sourceInvitation.contentSchemaVersion,
    theme_key: sourceInvitation.themeKey,
    theme_version: sourceInvitation.themeVersion,
    theme_overrides: sourceInvitation.themeOverrides,
    status: sourceInvitation.status,
    content: structuredClone(sourceInvitation.content),
    published_at: sourceInvitation.publishedAt,
    created_at: sourceInvitation.createdAt,
    updated_at: sourceInvitation.updatedAt,
    ...overrides,
  };
}

describe("Supabase datetime mapping", () => {
  it.each([
    ["canonical UTC", "2026-08-26T15:30:45.123Z", "2026-08-26T15:30:45.123Z"],
    ["UTC offset", "2026-08-26T15:30:45.123+00:00", "2026-08-26T15:30:45.123Z"],
    ["positive offset", "2026-08-26T22:30:45.123+07:00", "2026-08-26T15:30:45.123Z"],
    ["PostgreSQL microseconds", "2026-08-26T15:30:45.123456+00:00", "2026-08-26T15:30:45.123Z"],
  ])("normalizes %s invitation timestamps", (_label, rawValue, expected) => {
    const mapped = mapInvitation(invitationRow({ created_at: rawValue, updated_at: rawValue }));

    expect(mapped.createdAt).toBe(expected);
    expect(mapped.updatedAt).toBe(expected);
  });

  it("keeps published_at nullable", () => {
    expect(mapInvitation(invitationRow({ published_at: null })).publishedAt).toBeNull();
  });

  it("normalizes a non-null published_at timestamp", () => {
    const mapped = mapInvitation(invitationRow({
      status: "published",
      published_at: "2026-08-26T22:30:45+07:00",
    }));

    expect(mapped.publishedAt).toBe("2026-08-26T15:30:45.000Z");
  });

  it("rejects invalid and missing required timestamps at the mapper boundary", () => {
    expect(() => mapInvitation(invitationRow({ created_at: "not-a-datetime" }))).toThrow("Invalid datetime value for created_at.");
    expect(() => mapInvitation(invitationRow({ updated_at: undefined }))).toThrow("Invalid datetime value for updated_at.");
  });

  it("preserves complete invitation metadata and content while normalizing timestamps", () => {
    const mapped = mapInvitation(invitationRow({
      created_at: "2026-08-26T22:30:45.123+07:00",
      updated_at: "2026-08-26T15:30:45.123456+00:00",
    }));

    expect(mapped).toMatchObject({
      id: sourceInvitation.id,
      ownerId: sourceInvitation.ownerId,
      routeId: sourceInvitation.routeId,
      categoryKey: sourceInvitation.categoryKey,
      categoryVersion: sourceInvitation.categoryVersion,
      templateKey: sourceInvitation.templateKey,
      templateVersion: sourceInvitation.templateVersion,
      themeKey: sourceInvitation.themeKey,
      themeVersion: sourceInvitation.themeVersion,
      themeOverrides: sourceInvitation.themeOverrides,
      status: sourceInvitation.status,
    });
    expect(mapped.content).toEqual(sourceInvitation.content);
  });

  it("normalizes timestamps in route and profile mappers", () => {
    const timestamps = { created_at: "2026-08-26T22:30:45.123+07:00", updated_at: "2026-08-26T15:30:45.123456+00:00" };
    const route = mapRoute({ id: "route-1", owner_id: "owner-1", slug: "route-test", assigned_by: "user", ...timestamps });
    const profile = mapProfile({ id: "owner-1", name: "Owner", email: "owner@example.com", role: "user", status: "active", route_quota: 2, ...timestamps });

    expect(route).toMatchObject({ createdAt: "2026-08-26T15:30:45.123Z", updatedAt: "2026-08-26T15:30:45.123Z" });
    expect(profile).toMatchObject({ createdAt: "2026-08-26T15:30:45.123Z", updatedAt: "2026-08-26T15:30:45.123Z" });
  });
});

describe("Supabase invitation repository", () => {
  it("returns a successfully created invitation when the RPC row uses offset timestamps", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: invitationRow({
        created_at: "2026-08-26T22:30:45.123+07:00",
        updated_at: "2026-08-26T22:30:45.123+07:00",
      }),
      error: null,
    });
    const repository = new SupabaseApplicationRepository({ rpc } as unknown as SupabaseClient);

    const created = await repository.createInvitation(sourceInvitation.ownerId, {
      routeId: sourceInvitation.routeId,
      title: sourceInvitation.title,
      categoryKey: sourceInvitation.categoryKey,
      categoryVersion: sourceInvitation.categoryVersion,
      templateKey: sourceInvitation.templateKey,
      templateVersion: sourceInvitation.templateVersion,
      contentSchemaVersion: sourceInvitation.contentSchemaVersion,
      themeKey: sourceInvitation.themeKey,
      themeVersion: sourceInvitation.themeVersion,
      themeOverrides: sourceInvitation.themeOverrides,
      content: structuredClone(sourceInvitation.content),
    });

    expect(rpc).toHaveBeenCalledOnce();
    expect(created.createdAt).toBe("2026-08-26T15:30:45.123Z");
    expect(created.updatedAt).toBe("2026-08-26T15:30:45.123Z");
    expect(created.content).toEqual(sourceInvitation.content);
  });
});
