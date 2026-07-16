export const STORAGE_PREFIX = "ngaturi:mock:v1:";

export const STORAGE_KEYS = {
  users: `${STORAGE_PREFIX}users`,
  credentials: `${STORAGE_PREFIX}credentials`,
  session: `${STORAGE_PREFIX}session`,
  invitations: `${STORAGE_PREFIX}invitations`,
  templates: `${STORAGE_PREFIX}templates`,
} as const;
