import type { InvitationTemplateProps } from "@/templates/types";
import type { WeddingRenderModel } from "@/invitation-modules/schemas";

export function PlugAndPlayFixtureTemplate(props: InvitationTemplateProps<WeddingRenderModel>) {
  void props;
  return <div data-template="plug-and-play-fixture@1" />;
}
