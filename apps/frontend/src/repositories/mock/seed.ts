import { InvitationsSchema, MockCredentialsSchema, SessionSchema, TemplatesSchema, UsersSchema } from "@/domain";
import { z } from "zod";
import invitationsJson from "../../../../../contracts/dummy-data/invitations.json";
import templatesJson from "../../../../../contracts/dummy-data/templates.json";
import usersJson from "../../../../../contracts/dummy-data/users.json";
import credentialsJson from "./fixtures/credentials.json";
import type { StoragePort } from "../contracts";
import { MockDataError } from "./storage";
import { SCHEMA_VERSION, STORAGE_KEYS, STORAGE_NAMESPACE, STORAGE_PREFIX, STORAGE_VERSION } from "./keys";

export const StorageMetadataSchema = z.object({
  storageVersion: z.literal(STORAGE_VERSION),
  schemaVersion: z.literal(SCHEMA_VERSION),
  initializedAt: z.string().datetime(),
});

export type StorageMetadata = z.infer<typeof StorageMetadataSchema>;

export class MockStorageVersionError extends Error {
  constructor() {
    super("Versi data demo tidak kompatibel. Reset data demo untuk menggunakan schema terbaru.");
    this.name = "MockStorageVersionError";
  }
}

const seeds = [
  [STORAGE_KEYS.users, UsersSchema.parse(usersJson)],
  [STORAGE_KEYS.credentials, MockCredentialsSchema.parse(credentialsJson)],
  [STORAGE_KEYS.invitations, InvitationsSchema.parse(invitationsJson)],
  [STORAGE_KEYS.templates, TemplatesSchema.parse(templatesJson)],
] as const;

function listKeys(storage: StoragePort): string[] {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key): key is string => key !== null,
  );
}

function seedMissingData(storage: StoragePort): void {
  for (const [key, value] of seeds) {
    if (storage.getItem(key) === null) storage.setItem(key, JSON.stringify(value));
  }
}

function parseStored<T>(storage: StoragePort, key: string, schema: z.ZodType<T>): T {
  const raw = storage.getItem(key);
  if (raw === null) throw new MockDataError(key);
  try { return schema.parse(JSON.parse(raw)); }
  catch (cause) { throw new MockDataError(key, cause); }
}

function validateStoredData(storage: StoragePort): void {
  parseStored(storage, STORAGE_KEYS.users, UsersSchema);
  parseStored(storage, STORAGE_KEYS.credentials, MockCredentialsSchema);
  parseStored(storage, STORAGE_KEYS.invitations, InvitationsSchema);
  parseStored(storage, STORAGE_KEYS.templates, TemplatesSchema);
  if (storage.getItem(STORAGE_KEYS.session) !== null) parseStored(storage, STORAGE_KEYS.session, SessionSchema);
}

function writeMetadata(storage: StoragePort): void {
  const metadata: StorageMetadata = {
    storageVersion: STORAGE_VERSION,
    schemaVersion: SCHEMA_VERSION,
    initializedAt: new Date().toISOString(),
  };
  storage.setItem(STORAGE_KEYS.metadata, JSON.stringify(StorageMetadataSchema.parse(metadata)));
}

function removeProjectKeys(storage: StoragePort): void {
  for (const key of listKeys(storage).filter(isProjectStorageKey)) storage.removeItem(key);
}

export function initializeDemoData(storage: StoragePort): void {
  const hasLegacyNamespace = listKeys(storage).some(
    (key) => isProjectStorageKey(key) && !key.startsWith(STORAGE_PREFIX),
  );
  if (hasLegacyNamespace) removeProjectKeys(storage);

  const rawMetadata = storage.getItem(STORAGE_KEYS.metadata);
  if (rawMetadata !== null) {
    try { StorageMetadataSchema.parse(JSON.parse(rawMetadata)); }
    catch (cause) {
      if (cause instanceof SyntaxError) throw new MockDataError(STORAGE_KEYS.metadata, cause);
      throw new MockStorageVersionError();
    }
  }

  seedMissingData(storage);
  validateStoredData(storage);
  if (rawMetadata === null) writeMetadata(storage);
}

export function seedDemoData(storage: StoragePort): void {
  initializeDemoData(storage);
}

export function resetDemoData(storage: StoragePort): void {
  removeProjectKeys(storage);
  initializeDemoData(storage);
}

export function isProjectStorageKey(key: string): boolean {
  return key.startsWith(STORAGE_NAMESPACE);
}
