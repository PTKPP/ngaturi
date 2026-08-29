export const RECIPIENT_FALLBACK = "Tamu Undangan";
export const RECIPIENT_MAX_LENGTH = 100;

export function sanitizeRecipient(value: string | null | undefined): string {
  const normalized = value?.replace(/\s+/g, " ").trim().slice(0, RECIPIENT_MAX_LENGTH) ?? "";
  return normalized || RECIPIENT_FALLBACK;
}
