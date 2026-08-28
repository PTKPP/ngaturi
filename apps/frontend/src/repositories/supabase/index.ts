import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SupabaseApplicationRepository } from "./application-repository";
import { SupabaseInvitationMediaRepository } from "./media-repository";
import { SupabaseInvitationRsvpRepository } from "./rsvp-repository";
import { SupabaseInvitationWishRepository } from "./wish-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
export async function createApplicationRepository() { return new SupabaseApplicationRepository(await createServerSupabaseClient()); }
export async function createInvitationMediaRepository() { return new SupabaseInvitationMediaRepository(await createServerSupabaseClient()); }
export function createInvitationRsvpRepository() { return new SupabaseInvitationRsvpRepository(createAdminSupabaseClient()); }
export function createInvitationWishRepository() { return new SupabaseInvitationWishRepository(createAdminSupabaseClient()); }
