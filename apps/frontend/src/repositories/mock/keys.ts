export const STORAGE_NAMESPACE = "ngaturi:mock:";
export const STORAGE_VERSION = 1;
export const SCHEMA_VERSION = 1;
export const STORAGE_PREFIX = `${STORAGE_NAMESPACE}v${STORAGE_VERSION}:`;

export const STORAGE_KEYS = {
  metadata: `${STORAGE_PREFIX}metadata`,
  users: `${STORAGE_PREFIX}users`,
  credentials: `${STORAGE_PREFIX}credentials`,
  session: `${STORAGE_PREFIX}session`,
  invitations: `${STORAGE_PREFIX}invitations`,
  templates: `${STORAGE_PREFIX}templates`,
} as const;
