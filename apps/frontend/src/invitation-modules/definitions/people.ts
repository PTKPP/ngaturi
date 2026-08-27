import { z } from "zod";
import { MediaReferenceSchema, PartnerSchema } from "../schemas";
import { defineModule, stable } from "./shared";

const profileSchema = z.object({ fullName: z.string().trim().min(1), nickname: z.string().trim().min(1), photo: MediaReferenceSchema });

export const peopleModuleDefinitions = {
  "couple-profile": defineModule({ id: "couple-profile", name: "Profil pasangan", schema: z.object({ partnerOne: PartnerSchema, partnerTwo: PartnerSchema }), createDefault: () => ({ partnerOne: { fullName: "Partner Satu", nickname: "Satu", parentNames: [], photo: "" }, partnerTwo: { fullName: "Partner Dua", nickname: "Dua", parentNames: [], photo: "" } }), migrate: stable(z.object({ partnerOne: PartnerSchema, partnerTwo: PartnerSchema })), editor: "couple-profile" }),
  "child-profile": defineModule({ id: "child-profile", name: "Profil anak", schema: profileSchema, createDefault: () => ({ fullName: "Nama Anak", nickname: "Anak", photo: "" }), migrate: stable(profileSchema), editor: "configuration" }),
  parents: defineModule({ id: "parents", name: "Orang tua", schema: z.object({ names: z.array(z.string().trim().min(1)) }), createDefault: () => ({ names: [] }), migrate: stable(z.object({ names: z.array(z.string().trim().min(1)) })), editor: "configuration" }),
  "birth-info": defineModule({ id: "birth-info", name: "Informasi kelahiran", schema: z.object({ date: z.string(), place: z.string(), weight: z.string(), length: z.string() }), createDefault: () => ({ date: "", place: "", weight: "", length: "" }), migrate: stable(z.object({ date: z.string(), place: z.string(), weight: z.string(), length: z.string() })), editor: "configuration" }),
  speaker: defineModule({ id: "speaker", name: "Pembicara", schema: z.object({ items: z.array(z.object({ name: z.string(), role: z.string(), photo: MediaReferenceSchema })) }), createDefault: () => ({ items: [] }), migrate: stable(z.object({ items: z.array(z.object({ name: z.string(), role: z.string(), photo: MediaReferenceSchema })) })), editor: "configuration" }),
} as const;
