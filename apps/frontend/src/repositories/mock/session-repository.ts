import { MockCredentialsSchema, SessionSchema, type MockCredential, type Session } from "@/domain";
import type { SessionRepository, StoragePort } from "../contracts";
import { STORAGE_KEYS } from "./keys";
import { MockDataError, readValidated, writeValidated } from "./storage";

export class MockSessionRepository implements SessionRepository {
  constructor(private readonly storage: StoragePort) {}
  get(): Session | null {
    const value = this.storage.getItem(STORAGE_KEYS.session);
    if (value === null) return null;
    try { return SessionSchema.parse(JSON.parse(value)); }
    catch (error) { throw new MockDataError(STORAGE_KEYS.session, error); }
  }
  save(session: Session): void { writeValidated(this.storage, STORAGE_KEYS.session, SessionSchema, session); }
  clear(): void { this.storage.removeItem(STORAGE_KEYS.session); }
  listCredentials(): MockCredential[] {
    return readValidated(this.storage, STORAGE_KEYS.credentials, MockCredentialsSchema);
  }
}
