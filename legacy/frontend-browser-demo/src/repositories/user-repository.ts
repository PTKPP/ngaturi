import { UserSchema, UsersSchema, type User } from "@/domain";
import type { StoragePort, UserRepository } from "../contracts";
import { STORAGE_KEYS } from "./keys";
import { readValidated, writeValidated } from "./storage";

export class MockUserRepository implements UserRepository {
  constructor(private readonly storage: StoragePort) {}
  list(): User[] { return readValidated(this.storage, STORAGE_KEYS.users, UsersSchema); }
  findById(id: string): User | null { return this.list().find((user) => user.id === id) ?? null; }
  findByEmail(email: string): User | null {
    const normalized = email.trim().toLowerCase();
    return this.list().find((user) => user.email === normalized) ?? null;
  }
  create(user: User): User {
    const parsed = UserSchema.parse(user);
    writeValidated(this.storage, STORAGE_KEYS.users, UsersSchema, [...this.list(), parsed]);
    return parsed;
  }
  update(user: User): User {
    const parsed = UserSchema.parse(user);
    const users = this.list();
    if (!users.some((current) => current.id === parsed.id)) throw new Error("User tidak ditemukan.");
    writeValidated(this.storage, STORAGE_KEYS.users, UsersSchema, users.map((current) => current.id === parsed.id ? parsed : current));
    return parsed;
  }
}
