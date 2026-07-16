import { InvitationsSchema, MockCredentialsSchema, TemplatesSchema, UsersSchema } from "@/domain";
import invitationsJson from "../../../../../contracts/dummy-data/invitations.json";
import templatesJson from "../../../../../contracts/dummy-data/templates.json";
import usersJson from "../../../../../contracts/dummy-data/users.json";
import credentialsJson from "./fixtures/credentials.json";
import type { StoragePort } from "../contracts";
import { STORAGE_KEYS, STORAGE_PREFIX } from "./keys";

const seeds = [
  [STORAGE_KEYS.users, UsersSchema.parse(usersJson)],
  [STORAGE_KEYS.credentials, MockCredentialsSchema.parse(credentialsJson)],
  [STORAGE_KEYS.invitations, InvitationsSchema.parse(invitationsJson)],
  [STORAGE_KEYS.templates, TemplatesSchema.parse(templatesJson)],
] as const;

export function seedDemoData(storage: StoragePort): void {
  for (const [key, value] of seeds) {
    if (storage.getItem(key) === null) storage.setItem(key, JSON.stringify(value));
  }
}

export function resetDemoData(storage: StoragePort): void {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key): key is string => key !== null && isProjectStorageKey(key),
  );
  for (const key of keys) storage.removeItem(key);
  seedDemoData(storage);
}

export function isProjectStorageKey(key: string): boolean {
  return key.startsWith(STORAGE_PREFIX);
}
