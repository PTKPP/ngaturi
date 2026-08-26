import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("invitation_media").select("storage_path,mime_type,invitations!inner(status)").eq("id", id).eq("status", "ready").eq("invitations.status", "published").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await admin.storage.from("invitation-media").download(data.storage_path);
  if (result.error) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(result.data, { headers: { "Content-Type": data.mime_type, "Cache-Control": "public, max-age=300, stale-while-revalidate=3600", "X-Content-Type-Options": "nosniff" } });
}
