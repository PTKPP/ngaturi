import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SupabaseApplicationRepository } from "./application-repository";
import { SupabaseInvitationMediaRepository } from "./media-repository";
export async function createApplicationRepository() { return new SupabaseApplicationRepository(await createServerSupabaseClient()); }
export async function createInvitationMediaRepository() { return new SupabaseInvitationMediaRepository(await createServerSupabaseClient()); }
