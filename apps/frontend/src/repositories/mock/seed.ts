import {
  FrontendContractSchema, InvitationsSchema, InvitationRoutesSchema, InvitationThemesSchema,
  MockCredentialsSchema, SessionSchema, TemplatesSchema, UsersSchema,
} from "@/domain";
import { z } from "zod";
import invitationsJson from "../../../../../contracts/dummy-data/invitations.json";
import routesJson from "../../../../../contracts/dummy-data/routes.json";
import templatesJson from "../../../../../contracts/dummy-data/templates.json";
import themesJson from "../../../../../contracts/dummy-data/themes.json";
import usersJson from "../../../../../contracts/dummy-data/users.json";
import credentialsJson from "./fixtures/credentials.json";
import type { StoragePort } from "../contracts";
import { MockDataError } from "./storage";
import { SCHEMA_VERSION, STORAGE_KEYS, STORAGE_NAMESPACE, STORAGE_PREFIX, STORAGE_VERSION } from "./keys";

export const StorageMetadataSchema = z.object({
  storageVersion: z.literal(STORAGE_VERSION), schemaVersion: z.literal(SCHEMA_VERSION), initializedAt: z.string().datetime(),
});
const AnyStorageMetadataSchema = z.object({ storageVersion: z.number().int(), schemaVersion: z.number().int(), initializedAt: z.string().datetime() });
const LegacyV2UserSchema = z.object({
  id: z.string().min(1), name: z.string().trim().min(2), email: z.string().trim().toLowerCase().email(),
  role: z.enum(["admin", "user"]), status: z.enum(["active", "inactive"]), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
const LegacyV2InvitationSchema = z.object({
  id: z.string().min(1), ownerId: z.string().min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1), templateKey: z.string().trim().min(1), templateVersion: z.number().int().positive(),
  status: z.enum(["draft", "published", "inactive"]),
  couple: z.object({
    partnerOne: z.object({ fullName: z.string(), nickname: z.string(), parentNames: z.array(z.string()), photo: z.string() }),
    partnerTwo: z.object({ fullName: z.string(), nickname: z.string(), parentNames: z.array(z.string()), photo: z.string() }),
  }),
  events: z.array(z.object({
    id: z.string(), type: z.string(), title: z.string(), date: z.string(), startTime: z.string(), endTime: z.string(), timezone: z.string(),
    venueName: z.string(), address: z.string(), mapUrl: z.string(), sortOrder: z.number().int().nonnegative(),
  })).min(1),
  content: z.object({ openingText: z.string(), quote: z.string(), story: z.string(), closingText: z.string(), giftInformation: z.string() }),
  gallery: z.array(z.string()), settings: z.object({ showGiftInformation: z.boolean() }), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
const LegacyV2UsersSchema = z.array(LegacyV2UserSchema);
const LegacyV2InvitationsSchema = z.array(LegacyV2InvitationSchema);

export type StorageMetadata = z.infer<typeof StorageMetadataSchema>;
export class MockStorageVersionError extends Error {
  constructor() { super("Versi data demo tidak kompatibel. Reset data demo untuk menggunakan schema terbaru."); this.name = "MockStorageVersionError"; }
}

const frontendContract = FrontendContractSchema.parse({
  users: usersJson, routes: routesJson, templates: templatesJson, themes: themesJson, invitations: invitationsJson,
});
const credentials = MockCredentialsSchema.parse(credentialsJson);

function listKeys(storage: StoragePort): string[] {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => key !== null);
}
function parseStored<T>(storage: StoragePort, key: string, schema: z.ZodType<T>): T {
  const raw = storage.getItem(key);
  if (raw === null) throw new MockDataError(key);
  try { return schema.parse(JSON.parse(raw)); } catch (cause) { throw new MockDataError(key, cause); }
}
function parseRawMetadata(raw: string) {
  try { return AnyStorageMetadataSchema.parse(JSON.parse(raw)); }
  catch (cause) { if (cause instanceof SyntaxError) throw new MockDataError(STORAGE_KEYS.metadata, cause); throw new MockStorageVersionError(); }
}
function writeMetadata(storage: StoragePort): void {
  storage.setItem(STORAGE_KEYS.metadata, JSON.stringify(StorageMetadataSchema.parse({
    storageVersion: STORAGE_VERSION, schemaVersion: SCHEMA_VERSION, initializedAt: new Date().toISOString(),
  })));
}
function seedFresh(storage: StoragePort): void {
  const values = [
    [STORAGE_KEYS.users, frontendContract.users], [STORAGE_KEYS.credentials, credentials],
    [STORAGE_KEYS.routes, frontendContract.routes], [STORAGE_KEYS.invitations, frontendContract.invitations],
    [STORAGE_KEYS.templates, frontendContract.templates], [STORAGE_KEYS.themes, frontendContract.themes],
  ] as const;
  for (const [key, value] of values) if (storage.getItem(key) === null) storage.setItem(key, JSON.stringify(value));
}
function readCurrentContract(storage: StoragePort) {
  const contract = {
    users: parseStored(storage, STORAGE_KEYS.users, UsersSchema),
    routes: parseStored(storage, STORAGE_KEYS.routes, InvitationRoutesSchema),
    invitations: parseStored(storage, STORAGE_KEYS.invitations, InvitationsSchema),
    templates: parseStored(storage, STORAGE_KEYS.templates, TemplatesSchema),
    themes: parseStored(storage, STORAGE_KEYS.themes, InvitationThemesSchema),
  };
  parseStored(storage, STORAGE_KEYS.credentials, MockCredentialsSchema);
  try { FrontendContractSchema.parse(contract); } catch (cause) { throw new MockDataError(`${STORAGE_PREFIX}contract`, cause); }
  if (storage.getItem(STORAGE_KEYS.session) !== null) parseStored(storage, STORAGE_KEYS.session, SessionSchema);
  return contract;
}
function migrateV2(storage: StoragePort): void {
  const legacyUsers = parseStored(storage, STORAGE_KEYS.users, LegacyV2UsersSchema);
  const legacyInvitations = parseStored(storage, STORAGE_KEYS.invitations, LegacyV2InvitationsSchema);
  const templates = parseStored(storage, STORAGE_KEYS.templates, TemplatesSchema);
  parseStored(storage, STORAGE_KEYS.credentials, MockCredentialsSchema);
  if (storage.getItem(STORAGE_KEYS.session) !== null) parseStored(storage, STORAGE_KEYS.session, SessionSchema);

  const routes = legacyInvitations.map((invitation) => ({
    id: `route_migrated_${invitation.id}`, ownerId: invitation.ownerId, slug: invitation.slug,
    assignedBy: "migration" as const, createdAt: invitation.createdAt, updatedAt: invitation.updatedAt,
  }));
  const countByOwner = new Map<string, number>();
  for (const route of routes) countByOwner.set(route.ownerId, (countByOwner.get(route.ownerId) ?? 0) + 1);
  const users = legacyUsers.map((user) => ({ ...user, routeQuota: countByOwner.get(user.id) ?? 0 }));
  const themes = InvitationThemesSchema.parse(themesJson);
  const invitations = legacyInvitations.map((legacyInvitation) => {
    const { slug, ...invitation } = legacyInvitation;
    void slug;
    const defaultTheme = themes.find((theme) => theme.templateKey === invitation.templateKey && theme.templateVersion === invitation.templateVersion && theme.isDefault && theme.status === "active");
    if (!defaultTheme) throw new MockDataError(STORAGE_KEYS.themes);
    return { ...invitation, routeId: `route_migrated_${invitation.id}`, themeKey: defaultTheme.key, themeVersion: defaultTheme.version };
  });
  const migrated = FrontendContractSchema.parse({ users, routes, invitations, templates, themes });
  const keys = [STORAGE_KEYS.users, STORAGE_KEYS.routes, STORAGE_KEYS.invitations, STORAGE_KEYS.themes] as const;
  const previous = new Map(keys.map((key) => [key, storage.getItem(key)]));
  try {
    storage.setItem(STORAGE_KEYS.users, JSON.stringify(migrated.users));
    storage.setItem(STORAGE_KEYS.routes, JSON.stringify(migrated.routes));
    storage.setItem(STORAGE_KEYS.invitations, JSON.stringify(migrated.invitations));
    storage.setItem(STORAGE_KEYS.themes, JSON.stringify(migrated.themes));
    writeMetadata(storage);
  } catch (cause) {
    for (const [key, value] of previous) {
      if (value === null) storage.removeItem(key); else storage.setItem(key, value);
    }
    throw cause;
  }
}
function removeProjectKeys(storage: StoragePort): void {
  for (const key of listKeys(storage).filter(isProjectStorageKey)) storage.removeItem(key);
}

export function initializeDemoData(storage: StoragePort): void {
  const hasLegacyNamespace = listKeys(storage).some((key) => isProjectStorageKey(key) && !key.startsWith(STORAGE_PREFIX));
  if (hasLegacyNamespace) removeProjectKeys(storage);
  const rawMetadata = storage.getItem(STORAGE_KEYS.metadata);
  if (rawMetadata !== null) {
    const metadata = parseRawMetadata(rawMetadata);
    if (metadata.storageVersion !== STORAGE_VERSION) throw new MockStorageVersionError();
    if (metadata.schemaVersion === 2) { migrateV2(storage); return; }
    if (metadata.schemaVersion !== SCHEMA_VERSION) throw new MockStorageVersionError();
    readCurrentContract(storage);
    return;
  }

  const hasStoredCore = [STORAGE_KEYS.users, STORAGE_KEYS.invitations, STORAGE_KEYS.templates].some((key) => storage.getItem(key) !== null);
  if (hasStoredCore) {
    try { readCurrentContract(storage); writeMetadata(storage); return; }
    catch (currentError) {
      try { migrateV2(storage); return; }
      catch { throw currentError; }
    }
  }
  seedFresh(storage);
  readCurrentContract(storage);
  writeMetadata(storage);
}

export function seedDemoData(storage: StoragePort): void { initializeDemoData(storage); }
export function resetDemoData(storage: StoragePort): void { removeProjectKeys(storage); initializeDemoData(storage); }
export function isProjectStorageKey(key: string): boolean { return key.startsWith(STORAGE_NAMESPACE); }
