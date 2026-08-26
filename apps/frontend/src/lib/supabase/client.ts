"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnvironment } from "@/config/supabase";

export function createBrowserSupabaseClient() {
  const environment = requireSupabaseEnvironment();
  return createBrowserClient(environment.url, environment.publishableKey);
}
