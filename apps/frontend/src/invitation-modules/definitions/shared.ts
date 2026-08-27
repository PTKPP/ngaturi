import { z } from "zod";
import type { InvitationModuleDefinition, InvitationModuleId } from "../types";

export const textSchema = z.object({ text: z.string() });
export const configSchema = z.object({ enabled: z.boolean().default(true) }).passthrough();

export function defineModule<T>(value: Omit<InvitationModuleDefinition<T>, "version">): InvitationModuleDefinition<T> {
  return { ...value, version: 1 };
}

export function stable<T>(schema: z.ZodType<T>) {
  return (version: number, value: unknown): T => {
    if (version !== 1) throw new Error(`Versi modul ${version} tidak didukung.`);
    return schema.parse(value);
  };
}

export function textModule(id: InvitationModuleId, name: string, defaultText: string, editor: "text" | "long-text" = "long-text") {
  return defineModule({ id, name, schema: textSchema, createDefault: () => ({ text: defaultText }), migrate: stable(textSchema), editor });
}
