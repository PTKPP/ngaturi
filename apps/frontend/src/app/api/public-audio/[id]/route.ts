import { NextResponse } from "next/server";
import { currentProfile } from "@/application/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function contentSelectsCustomMusic(value: unknown, mediaId: string): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const modules = (value as Record<string, unknown>).modules;
  if (!modules || typeof modules !== "object" || Array.isArray(modules)) return false;
  const music = (modules as Record<string, unknown>).music;
  return Boolean(music && typeof music === "object" && !Array.isArray(music) &&
    (music as Record<string, unknown>).trackId === "custom" &&
    (music as Record<string, unknown>).mediaId === mediaId);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("invitation_media")
    .select("storage_path,owner_id,status,media_kind,media_purpose,invitations!inner(status,content)")
    .eq("id", id)
    .eq("media_kind", "audio")
    .eq("media_purpose", "invitation_music")
    .eq("status", "ready")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invitation = Array.isArray(data.invitations) ? data.invitations[0] : data.invitations;
  const published = invitation?.status === "published" && contentSelectsCustomMusic(invitation.content, id);
  if (!published) {
    const actor = await currentProfile();
    if (!actor || actor.id !== data.owner_id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: signed, error: signedError } = await admin.storage.from("invitation-media").createSignedUrl(String(data.storage_path), 60);
  if (signedError || !signed?.signedUrl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const response = NextResponse.redirect(signed.signedUrl, 307);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
