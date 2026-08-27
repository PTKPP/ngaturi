import { INVITATION_MODULE_IDS, type InvitationModuleDefinition, type InvitationModuleId } from "./types";
import { contentModuleDefinitions } from "./definitions/content";
import { interactionModuleDefinitions } from "./definitions/interactions";
import { mediaModuleDefinitions } from "./definitions/media";
import { peopleModuleDefinitions } from "./definitions/people";
import { scheduleModuleDefinitions } from "./definitions/schedule";

export const moduleRegistry = {
  ...contentModuleDefinitions,
  ...peopleModuleDefinitions,
  ...scheduleModuleDefinitions,
  ...mediaModuleDefinitions,
  ...interactionModuleDefinitions,
} satisfies Record<InvitationModuleId, InvitationModuleDefinition>;

for (const [key, definition] of Object.entries(moduleRegistry)) if (key !== definition.id) throw new Error(`Key registry modul tidak cocok: ${key}.`);
if (Object.keys(moduleRegistry).length !== INVITATION_MODULE_IDS.length) throw new Error("Registry modul tidak sama dengan kontrak ID.");

export function getInvitationModule(id: string): InvitationModuleDefinition | null {
  return moduleRegistry[id as InvitationModuleId] ?? null;
}
