import { type ZodType } from "zod";
import type { StoragePort } from "../contracts";

export class MockDataError extends Error {
  constructor(key: string, cause?: unknown) {
    super(`Data demo pada ${key} tidak valid. Reset data demo untuk memulihkan fixture.`);
    this.name = "MockDataError";
    this.cause = cause;
  }
}

export function readValidated<T>(storage: StoragePort, key: string, schema: ZodType<T>): T {
  const raw = storage.getItem(key);
  if (raw === null) throw new MockDataError(key);
  try {
    return schema.parse(JSON.parse(raw));
  } catch (error) {
    throw new MockDataError(key, error);
  }
}

export function writeValidated<T>(storage: StoragePort, key: string, schema: ZodType<T>, value: T): T {
  const parsed = schema.parse(value);
  storage.setItem(key, JSON.stringify(parsed));
  return parsed;
}
