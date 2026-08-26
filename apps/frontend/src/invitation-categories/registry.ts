import { z } from "zod";
import { INVITATION_MODULE_IDS, InvitationModuleIdSchema, ModuleCapabilitySchema, type InvitationModuleId, type ModuleCapability } from "@/invitation-modules/types";

export const InvitationCategoryKeySchema = z.enum(["wedding", "khitan", "aqiqah", "birthday", "corporate"]);
export type InvitationCategoryKey = z.infer<typeof InvitationCategoryKeySchema>;

export const InvitationCategorySchema = z.object({
  key: InvitationCategoryKeySchema,
  version: z.number().int().positive(),
  name: z.string().min(1),
  requiredModules: z.array(InvitationModuleIdSchema),
  capabilities: z.record(InvitationModuleIdSchema, ModuleCapabilitySchema),
}).superRefine((category, context) => {
  for (const id of INVITATION_MODULE_IDS) {
    if (!(id in category.capabilities)) context.addIssue({ code: "custom", path: ["capabilities", id], message: `Kapabilitas modul ${id} harus dinyatakan eksplisit.` });
  }
  for (const id of category.requiredModules) {
    if (category.capabilities[id] !== "required") context.addIssue({ code: "custom", path: ["requiredModules"], message: `Modul wajib ${id} harus berstatus required.` });
  }
});

function capabilities(required: InvitationModuleId[], defaults: InvitationModuleId[], optional: InvitationModuleId[]): Record<InvitationModuleId, ModuleCapability> {
  const result = Object.fromEntries(INVITATION_MODULE_IDS.map((id) => [id, "unsupported"])) as Record<InvitationModuleId, ModuleCapability>;
  for (const id of optional) result[id] = "optional";
  for (const id of defaults) result[id] = "default";
  for (const id of required) result[id] = "required";
  return result;
}

export const InvitationCategoriesSchema = z.array(InvitationCategorySchema).superRefine((categories, context) => {
  const ids = new Set<string>();
  for (const [index, category] of categories.entries()) {
    const id = `${category.key}@${category.version}`;
    if (ids.has(id)) context.addIssue({ code: "custom", path: [index, "key"], message: `Kategori duplikat: ${id}.` });
    ids.add(id);
  }
});

export const categoryRegistry = InvitationCategoriesSchema.parse([
  {
    key: "wedding", version: 1, name: "Pernikahan",
    requiredModules: ["cover", "couple-profile", "event", "closing"],
    capabilities: capabilities(
      ["cover", "couple-profile", "event", "closing"],
      ["greeting", "quote", "countdown", "love-story", "gallery", "maps"],
      ["parents", "video", "rsvp", "gift", "wishes", "qr-check-in", "livestream"],
    ),
  },
  {
    key: "khitan", version: 1, name: "Khitan",
    requiredModules: ["cover", "child-profile", "event", "closing"],
    capabilities: capabilities(
      ["cover", "child-profile", "event", "closing"],
      ["greeting", "parents", "quote", "countdown", "gallery", "maps"],
      ["video", "rsvp", "gift", "wishes", "qr-check-in", "livestream"],
    ),
  },
  {
    key: "aqiqah", version: 1, name: "Aqiqah",
    requiredModules: ["cover", "child-profile", "birth-info", "event", "closing"],
    capabilities: capabilities(
      ["cover", "child-profile", "birth-info", "event", "closing"],
      ["greeting", "parents", "quote", "gallery", "maps"],
      ["countdown", "video", "rsvp", "gift", "wishes", "qr-check-in", "livestream"],
    ),
  },
  {
    key: "birthday", version: 1, name: "Ulang Tahun",
    requiredModules: ["cover", "event", "closing"],
    capabilities: capabilities(
      ["cover", "event", "closing"],
      ["greeting", "countdown", "gallery", "maps"],
      ["child-profile", "parents", "quote", "video", "rsvp", "gift", "wishes", "qr-check-in", "livestream"],
    ),
  },
  {
    key: "corporate", version: 1, name: "Korporat",
    requiredModules: ["cover", "event", "closing"],
    capabilities: capabilities(
      ["cover", "event", "closing"],
      ["greeting", "speaker", "agenda", "maps"],
      ["countdown", "gallery", "video", "rsvp", "wishes", "qr-check-in", "livestream"],
    ),
  },
]);

export function getInvitationCategory(key: string, version: number) {
  return categoryRegistry.find((category) => category.key === key && category.version === version) ?? null;
}
