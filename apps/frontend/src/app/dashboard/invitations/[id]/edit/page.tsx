import { AppShell } from "@/components/AppShell";
import { InvitationEditorClient } from "@/components/InvitationEditorClient";
import { requireProfile } from "@/application/auth";
import { createApplicationRepository } from "@/repositories/supabase";
import { createInvitationMediaRepository } from "@/repositories/supabase";
import { InvitationMediaService } from "@/application/media-service";

export default async function EditInvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const repository = await createApplicationRepository();
  const [invitation, templates, themes, routes] = await Promise.all([repository.findOwnedInvitation(profile.id, id), repository.listTemplates(), repository.listThemes(), repository.listOwnedRoutes(profile.id)]);
  if (!invitation) return <AppShell title="Editor undangan"><main className="state-card"><h2>Undangan tidak ditemukan</h2></main></AppShell>;
  const mediaService = new InvitationMediaService(await createInvitationMediaRepository());
  const [images, audio] = await Promise.all([mediaService.listOwnedImages(profile, id), mediaService.listOwnedAudio(profile, id)]);
  const media = [...images, ...audio];
  const routeSlug = routes.find(({ route }) => route.id === invitation.routeId)?.route.slug ?? "route-tidak-tersedia";
  return <AppShell title="Editor undangan"><InvitationEditorClient initialInvitation={invitation} initialMedia={media} templates={templates} themes={themes} routeSlug={routeSlug} /></AppShell>;
}
