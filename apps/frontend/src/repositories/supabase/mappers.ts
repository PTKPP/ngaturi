import { z } from "zod";
import { InvitationRouteSchema, InvitationSchema, TemplateSchema, InvitationThemeSchema, UserSchema } from "@/domain";

type Row = Record<string, unknown>;
const stringValue = (row: Row, key: string) => String(row[key]);
const numberValue = (row: Row, key: string) => Number(row[key]);
const SupabaseDateTimeSchema = z.iso.datetime({ offset: true });

function dateTimeValue(row: Row, key: string): string {
  const rawValue = row[key];
  const parsedValue = SupabaseDateTimeSchema.safeParse(rawValue);

  if (!parsedValue.success) {
    throw new Error(`Invalid datetime value for ${key}.`);
  }

  return new Date(parsedValue.data).toISOString();
}

function nullableDateTimeValue(row: Row, key: string): string | null {
  if (row[key] === null || row[key] === undefined) return null;
  return dateTimeValue(row, key);
}

export function mapInvitation(row: Row) {
  return InvitationSchema.parse({
    id: stringValue(row, "id"), ownerId: stringValue(row, "owner_id"), routeId: stringValue(row, "route_id"), title: stringValue(row, "title"),
    categoryKey: row.category_key ?? "wedding", categoryVersion: row.category_version ?? 1,
    templateKey: stringValue(row, "template_key"), templateVersion: numberValue(row, "template_version"), contentSchemaVersion: numberValue(row, "content_schema_version"),
    themeKey: stringValue(row, "theme_key"), themeVersion: numberValue(row, "theme_version"), themeOverrides: row.theme_overrides ?? {}, status: row.status, content: row.content,
    publishedAt: nullableDateTimeValue(row, "published_at"), createdAt: dateTimeValue(row, "created_at"), updatedAt: dateTimeValue(row, "updated_at"),
  });
}

export function mapRoute(row: Row) { return InvitationRouteSchema.parse({ id: row.id, ownerId: row.owner_id, slug: row.slug, assignedBy: row.assigned_by, createdAt: dateTimeValue(row, "created_at"), updatedAt: dateTimeValue(row, "updated_at") }); }
export function mapProfile(row: Row) { return UserSchema.parse({ id: row.id, name: row.name, email: row.email, role: row.role, status: row.status, routeQuota: row.route_quota, createdAt: dateTimeValue(row, "created_at"), updatedAt: dateTimeValue(row, "updated_at") }); }
export function mapTemplate(row: Row) { return TemplateSchema.parse({ key: row.key, version: row.version, name: row.name, description: row.description, thumbnail: row.thumbnail, status: row.status, categoryKey: row.category_key, categoryVersion: row.category_version, activeContentSchemaVersion: row.active_content_schema_version, themeSchemaVersion: row.theme_schema_version, supportedModules: row.supported_modules, requiredModules: row.required_modules, optionalModules: row.optional_modules, defaultEnabledModules: row.default_enabled_modules, sections: row.sections, supportedSections: row.supported_sections }); }
export function mapTheme(row: Row) { return InvitationThemeSchema.parse({ key: row.key, version: row.version, templateKey: row.template_key, templateVersion: row.template_version, name: row.name, description: row.description, status: row.status, isDefault: row.is_default, tokens: row.tokens }); }
