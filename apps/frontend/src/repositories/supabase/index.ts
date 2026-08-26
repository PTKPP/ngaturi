import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SupabaseApplicationRepository } from "./application-repository";
export async function createApplicationRepository() { return new SupabaseApplicationRepository(await createServerSupabaseClient()); }
