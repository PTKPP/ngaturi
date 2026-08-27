import type { MockCredential, Session } from "@/domain";

export interface SessionRepository {
  get(): Session | null;
  save(session: Session): void;
  clear(): void;
  listCredentials(): MockCredential[];
}
