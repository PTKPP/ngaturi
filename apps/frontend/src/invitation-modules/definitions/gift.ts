import { z } from "zod";
import { defineModule, textSchema } from "./shared";

export const MAX_GIFT_ACCOUNTS = 8;
export const MAX_GIFT_ACCOUNTS_PER_TYPE = 5;

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");
const normalizedRequired = (rawMax: number, min: number, max: number) => z.string()
  .max(rawMax)
  .transform(normalizeWhitespace)
  .pipe(z.string().min(min).max(max));
const normalizedOptional = (rawMax: number, max: number) => z.string()
  .max(rawMax)
  .transform(normalizeWhitespace)
  .pipe(z.string().max(max));

const GiftAccountBaseSchema = z.object({
  id: z.string().uuid(),
  provider: normalizedRequired(160, 2, 60),
  accountNumber: normalizedRequired(100, 4, 40).pipe(z.string().regex(/^[0-9A-Za-z+(). /-]+$/, "Nomor akun memuat karakter yang tidak didukung.")),
  accountHolder: normalizedRequired(240, 2, 100),
});

export const GiftBankAccountSchema = GiftAccountBaseSchema.extend({ type: z.literal("bank") });
export const GiftEWalletSchema = GiftAccountBaseSchema.extend({ type: z.literal("e_wallet") });
export const PhysicalGiftSchema = z.object({
  enabled: z.boolean().default(false),
  recipient: normalizedOptional(240, 100).default(""),
  address: normalizedOptional(1200, 500).default(""),
  note: normalizedOptional(700, 300).default(""),
}).superRefine((value, context) => {
  if (!value.enabled) return;
  if (value.recipient.length < 2) context.addIssue({ code: "custom", path: ["recipient"], message: "Penerima hadiah fisik wajib diisi." });
  if (value.address.length < 10) context.addIssue({ code: "custom", path: ["address"], message: "Alamat hadiah fisik minimal 10 karakter." });
});

export const GiftModuleSchema = z.object({
  bankAccounts: z.array(GiftBankAccountSchema).max(MAX_GIFT_ACCOUNTS_PER_TYPE),
  eWallets: z.array(GiftEWalletSchema).max(MAX_GIFT_ACCOUNTS_PER_TYPE),
  physicalGift: PhysicalGiftSchema,
  legacyText: normalizedOptional(4200, 2000).default(""),
}).superRefine((value, context) => {
  const accounts = [...value.bankAccounts, ...value.eWallets];
  if (accounts.length > MAX_GIFT_ACCOUNTS) context.addIssue({ code: "custom", path: ["bankAccounts"], message: `Maksimal ${MAX_GIFT_ACCOUNTS} akun hadiah.` });
  const ids = new Set<string>();
  const identities = new Set<string>();
  for (const account of accounts) {
    if (ids.has(account.id)) context.addIssue({ code: "custom", message: "ID akun hadiah harus unik." });
    ids.add(account.id);
    const identifier = account.accountNumber.toLocaleLowerCase("id-ID").replace(/[\s-]/g, "");
    const identity = `${account.type}\u001f${account.provider.toLocaleLowerCase("id-ID")}\u001f${identifier}`;
    if (identities.has(identity)) context.addIssue({ code: "custom", message: "Akun hadiah duplikat tidak diperbolehkan." });
    identities.add(identity);
  }
});

export type GiftBankAccount = z.infer<typeof GiftBankAccountSchema>;
export type GiftEWallet = z.infer<typeof GiftEWalletSchema>;
export type PhysicalGift = z.infer<typeof PhysicalGiftSchema>;
export type GiftModule = z.infer<typeof GiftModuleSchema>;

export const createDefaultGift = (): GiftModule => ({
  bankAccounts: [],
  eWallets: [],
  physicalGift: { enabled: false, recipient: "", address: "", note: "" },
  legacyText: "",
});

export function hasPublicGift(value: GiftModule): boolean {
  return Boolean(value.bankAccounts.length || value.eWallets.length || value.legacyText || value.physicalGift.enabled);
}

export function giftToCompatibilityText(value: GiftModule): string {
  const lines = [value.legacyText];
  for (const account of value.bankAccounts) lines.push(`${account.provider}: ${account.accountNumber} a.n. ${account.accountHolder}`);
  for (const account of value.eWallets) lines.push(`${account.provider}: ${account.accountNumber} a.n. ${account.accountHolder}`);
  if (value.physicalGift.enabled) {
    lines.push(`Hadiah fisik untuk ${value.physicalGift.recipient}: ${value.physicalGift.address}${value.physicalGift.note ? ` (${value.physicalGift.note})` : ""}`);
  }
  return lines.filter(Boolean).join("\n");
}

export function maskGiftAccountIdentifier(value: string): string {
  const compact = value.replace(/\s+/g, "");
  if (!compact) return "Belum diisi";
  return `•••• ${compact.slice(-4)}`;
}

export function maskGiftAddress(value: string): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return "Alamat belum diisi";
  return `${normalized.slice(0, Math.min(12, normalized.length))}${normalized.length > 12 ? "•••" : ""}`;
}

export const giftModuleDefinition = defineModule<GiftModule>({
  id: "gift",
  version: 2,
  name: "Hadiah",
  schema: GiftModuleSchema,
  createDefault: createDefaultGift,
  migrate: (version, value) => {
    if (version === 1) {
      const legacy = textSchema.parse(value);
      return GiftModuleSchema.parse({ ...createDefaultGift(), legacyText: legacy.text });
    }
    if (version === 2) return GiftModuleSchema.parse(value);
    throw new Error(`Versi modul gift ${version} tidak didukung.`);
  },
  editor: "gift",
});
