export const RESERVED_SLUGS = new Set(["admin", "dashboard", "login", "register", "api", "assets", "_next", "favicon.ico"]);

export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function assertAllowedSlug(slug: string): void {
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Slug hanya boleh berisi huruf kecil, angka, dan pemisah dash.");
  if (RESERVED_SLUGS.has(slug)) throw new Error("Slug tersebut dicadangkan oleh aplikasi.");
}
