import { InvitationSchema, InvitationsSchema, type Invitation } from "@/domain";
import type { InvitationRepository, StoragePort } from "../contracts";
import { STORAGE_KEYS } from "./keys";
import { readValidated, writeValidated } from "./storage";

export class MockInvitationRepository implements InvitationRepository {
  constructor(private readonly storage: StoragePort) {}
  list(): Invitation[] { return readValidated(this.storage, STORAGE_KEYS.invitations, InvitationsSchema); }
  findById(id: string): Invitation | null { return this.list().find((item) => item.id === id) ?? null; }
  findBySlug(slug: string): Invitation | null { return this.list().find((item) => item.slug === slug) ?? null; }
  create(invitation: Invitation): Invitation {
    const parsed = InvitationSchema.parse(invitation);
    writeValidated(this.storage, STORAGE_KEYS.invitations, InvitationsSchema, [...this.list(), parsed]);
    return parsed;
  }
  update(invitation: Invitation): Invitation {
    const parsed = InvitationSchema.parse(invitation);
    const invitations = this.list();
    if (!invitations.some((item) => item.id === parsed.id)) throw new Error("Undangan tidak ditemukan.");
    writeValidated(this.storage, STORAGE_KEYS.invitations, InvitationsSchema, invitations.map((item) => item.id === parsed.id ? parsed : item));
    return parsed;
  }
}
