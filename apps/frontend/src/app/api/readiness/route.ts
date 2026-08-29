import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient();
    const [template, bucket] = await Promise.all([
      supabase.from("template_catalog").select("key", { head: true, count: "exact" }).eq("key", "wedding-default").eq("version", 1).eq("status", "active"),
      supabase.storage.getBucket("invitation-media"),
    ]);
    if (template.error || template.count !== 1 || bucket.error || !bucket.data) throw new Error("dependency_check_failed");
    return NextResponse.json(
      { status: "ready", service: "ngaturi-frontend" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(JSON.stringify({
      event: "frontend_readiness_failed",
      error: error instanceof Error ? error.message : "unknown",
    }));
    return NextResponse.json(
      { status: "not_ready", service: "ngaturi-frontend" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
