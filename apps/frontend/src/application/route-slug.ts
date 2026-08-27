export const RESERVED_SLUGS = new Set(["admin", "dashboard", "login", "register", "api", "assets", "_next", "favicon.ico"]);

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function validateRouteSlug(value: string): string {
  const raw = value.trim().toLowerCase();
  if (raw.includes("&")) throw new Error("Slug tidak boleh menggunakan karakter &.");
  if (RESERVED_SLUGS.has(raw)) throw new Error("Slug tersebut dicadangkan oleh aplikasi.");
  const slug = normalizeSlug(raw);
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug hanya boleh berisi huruf kecil, angka, dan pemisah dash.");
  if (RESERVED_SLUGS.has(slug)) throw new Error("Slug tersebut dicadangkan oleh aplikasi.");
  return slug;
}
