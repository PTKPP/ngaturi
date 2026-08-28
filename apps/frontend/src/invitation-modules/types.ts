import { z } from "zod";

export const INVITATION_MODULE_IDS = [
  "cover", "greeting", "couple-profile", "child-profile", "parents", "quote",
  "event", "countdown", "love-story", "birth-info", "speaker", "agenda",
  "gallery", "video", "rsvp", "gift", "wishes", "maps", "qr-check-in",
  "livestream", "music", "closing",
] as const;

export const InvitationModuleIdSchema = z.enum(INVITATION_MODULE_IDS);
export type InvitationModuleId = z.infer<typeof InvitationModuleIdSchema>;

export const ModuleCapabilitySchema = z.enum(["required", "default", "optional", "unsupported"]);
export type ModuleCapability = z.infer<typeof ModuleCapabilitySchema>;

export interface InvitationModuleDefinition<T = unknown> {
  id: InvitationModuleId;
  version: number;
  name: string;
  schema: z.ZodType<T>;
  createDefault(): T;
  migrate(version: number, value: unknown): T;
  editor: "text" | "long-text" | "event-list" | "couple-profile" | "media-list" | "configuration" | "gift";
}
