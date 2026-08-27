import type { User } from "@/domain";

export interface UserRepository {
  list(): User[];
  findById(id: string): User | null;
  findByEmail(email: string): User | null;
  create(user: User): User;
  update(user: User): User;
}
