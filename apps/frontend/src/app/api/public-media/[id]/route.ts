import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { currentProfile } from "@/application/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VARIANTS = new Set(["original", "thumbnail", "medium", "large"]);
function contentReferencesMedia(value: unknown, mediaId: string): boolean {
  if (value === mediaId) return true;
  if (Array.isArray(value)) return value.some((item) => contentReferencesMedia(item, mediaId));
  return Boolean(value && typeof value === "object" && Object.values(value as Record<string, unknown>).some((item) => contentReferencesMedia(item, mediaId)));
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const variant = new URL(request.url).searchParams.get("variant") ?? "large";
  if (!UUID.test(id) || !VARIANTS.has(variant)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("invitation_media")
    .select("storage_path,mime_type,owner_id,status,client_upload_id,invitations!inner(status,content)")
    .eq("id", id)
    .eq("status", "ready")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const invitation = Array.isArray(data.invitations) ? data.invitations[0] : data.invitations;
  const published = invitation?.status === "published" && contentReferencesMedia(invitation.content, id);
  if (!published || variant === "original") {
    const actor = await currentProfile();
    if (!actor || actor.id !== data.owner_id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let storagePath = String(data.storage_path);
  let mimeType = String(data.mime_type);
  if (variant !== "original") {
    const { data: selected, error: variantError } = await admin.from("invitation_media_variants")
      .select("storage_path,mime_type")
      .eq("media_id", id)
      .eq("variant_key", variant)
      .eq("status", "ready")
      .maybeSingle();
    if (variantError || (!selected && data.client_upload_id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (selected) {
      storagePath = String(selected.storage_path);
      mimeType = String(selected.mime_type);
    }
  }
  const result = await admin.storage.from("invitation-media").download(storagePath);
  if (result.error) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(result.data, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": published && variant !== "original" ? "public, max-age=300, stale-while-revalidate=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
